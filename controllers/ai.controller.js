import { GoogleGenerativeAI } from "@google/generative-ai";
import Artisan from "../models/artisan.model.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const aiChat = async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: "Messages array is required" });
        }

        const systemPrompt = `You are 'FixrBot', a helpful assistant for the Fixr repair marketplace. Fixr serves BOTH home/property repairs AND automotive/vehicle repairs. The platform explicitly supports the following artisan types: mechanic, plumber, welder, carpenter, tailor, shoe-maker, technician, and electrician. Your job is to help customers figure out what kind of artisan they need based on their problem, answer basic queries, and guide them on how to book on the platform. Keep your responses friendly, very concise, and directly helpful. Do not provide actual DIY repair instructions for safety reasons - always recommend an artisan. When suggesting artisans from your search, format their names as markdown links to their profiles using this exact syntax: [Name](/artisan/id). For example: "I recommend [John Doe](/artisan/65abc123...)."`;

        // Configure Gemini 2.5 Flash with Tools
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
            tools: [{
                functionDeclarations: [{
                    name: "suggest_artisans",
                    description: "Search the FIXR database for real, verified artisans based on the service needed. Use this whenever the user asks for a recommendation, needs someone to fix something, or asks to find an artisan. Supported services: mechanic, plumber, welder, carpenter, tailor, shoe-maker, technician, electrician.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            serviceRendered: { type: "STRING", description: "The type of artisan needed (e.g. 'plumber', 'mechanic', 'electrician')." },
                            city: { type: "STRING", description: "Optional city of the user" }
                        },
                        required: ["serviceRendered"]
                    }
                }]
            }]
        });

        // Convert the previous frontend messages into Google Generative AI format
        let history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Gemini STRICTLY requires the history to start with a 'user' role.
        // We must remove the initial default greeting sent by the frontend model.
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        const latestMessage = messages[messages.length - 1].content;

        const chat = model.startChat({ history });

        let result = await chat.sendMessage(latestMessage);
        
        // Check if Gemini wants to call our function
        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            if (call.name === "suggest_artisans") {
                const { serviceRendered, city } = call.args;
                
                let query = { applicationStatus: "approved" };
                if (serviceRendered) query.serviceRendered = serviceRendered.toLowerCase();
                if (city) query.city = new RegExp(city, "i");
                
                // Fetch all matches for the requested service
                const artisans = await Artisan.find(query).lean();
                
                // DATA SCIENCE RANKING ALGORITHM
                // We rank based on: 40% Rating, 30% Experience, 30% Non-Complaint Rate
                let rankedArtisans = artisans.map(a => {
                    const ratingScore = a.reviews?.length ? (a.reviews.reduce((sum, r) => sum + r.rating, 0) / a.reviews.length) : 0;
                    
                    // Normalize scores (Rating out of 5, Experience capped at 25 years, Complaint Rate is ideally 0)
                    const normalizedRating = ratingScore / 5;
                    const normalizedExperience = Math.min(a.yearsOfExperience || 1, 25) / 25; 
                    const normalizedComplaint = 1 - Math.min(a.complaintRate || 0, 1);
                    
                    const bookingProbability = (0.4 * normalizedRating) + (0.3 * normalizedExperience) + (0.3 * normalizedComplaint);

                    return {
                        name: `${a.firstName} ${a.lastName}`,
                        service: a.serviceRendered,
                        rating: ratingScore > 0 ? ratingScore.toFixed(1) : "New",
                        experience: a.yearsOfExperience,
                        complaintRate: a.complaintRate || 0,
                        bookingProbability: parseFloat(bookingProbability.toFixed(3)),
                        id: a._id.toString(),
                        city: a.city
                    };
                });
                
                // Sort by booking probability descending and pick top 3
                rankedArtisans.sort((a, b) => b.bookingProbability - a.bookingProbability);
                const matches = rankedArtisans.slice(0, 3);
                
                const apiResponse = { 
                    result: matches.length > 0 ? matches : "No artisans found matching this criteria." 
                };
                
                // Send the DB results back to Gemini so it can generate a final response
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: "suggest_artisans",
                        response: apiResponse
                    }
                }]);
            }
        }

        const responseText = result.response.text();

        return res.status(200).json({ reply: responseText });
    } catch (err) {
        console.error("Error in AI Chat:", err);
        return res.status(500).json({ message: "Error communicating with FixrBot", details: err.message });
    }
};

export const aiMatch = async (req, res) => {
    try {
        const { problemDescription, location } = req.body;
        
        if (!problemDescription) {
            return res.status(400).json({ message: "Problem description is required to match an artisan." });
        }

        const inferredService = inferServiceFromProblem(problemDescription);
        const baseQuery = { applicationStatus: "approved" };
        if (inferredService) {
            baseQuery.serviceRendered = inferredService;
        }
        if (location) {
            const locationRegex = new RegExp(location, "i");
            baseQuery.$or = [{ city: locationRegex }, { state: locationRegex }];
        }

        const projection = "_id firstName lastName serviceRendered serviceDescription city state reviews yearsOfExperience completedJobs";

        // Fetch filtered artisans first (service + location)
        let artisans = await Artisan.find(baseQuery, projection).lean();

        // If none found for location, relax location filter
        if (artisans.length === 0 && location) {
            const relaxedQuery = { applicationStatus: "approved" };
            if (inferredService) {
                relaxedQuery.serviceRendered = inferredService;
            }
            artisans = await Artisan.find(relaxedQuery, projection).lean();
        }

        // If still empty and service was inferred, relax service filter
        if (artisans.length === 0 && inferredService) {
            const relaxedQuery = { applicationStatus: "approved" };
            if (location) {
                const locationRegex = new RegExp(location, "i");
                relaxedQuery.$or = [{ city: locationRegex }, { state: locationRegex }];
            }
            artisans = await Artisan.find(relaxedQuery, projection).lean();
        }

        if (!artisans || artisans.length === 0) {
            return res.status(200).json({ matches: [], message: "No verified artisans available." });
        }

        // Rank locally to keep the model input small
        const rankedArtisans = artisans.map(a => {
            const avgRating = a.reviews?.length 
                ? a.reviews.reduce((sum, r) => sum + r.rating, 0) / a.reviews.length 
                : 0;
            
            return {
                id: a._id.toString(),
                name: `${a.firstName} ${a.lastName}`,
                service: a.serviceRendered,
                bio: a.serviceDescription,
                city: a.city,
                avgRating: Number(avgRating.toFixed(1)),
                totalReviews: a.reviews?.length || 0
            };
        });

        rankedArtisans.sort((a, b) => {
            if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
            return b.totalReviews - a.totalReviews;
        });

        const topCandidates = rankedArtisans.slice(0, 50);

        const prompt = `A user needs an artisan for the following problem: "${problemDescription}". 
The user is located in: "${location || 'Not specified'}".

Here is the JSON list of available verified artisans:
${JSON.stringify(topCandidates, null, 2)}

Analyze the user's problem, focusing heavily on the item that needs repair. 
You MUST prioritize finding artisans whose "service" or "bio" matches the problem AND whose "city" matches the user's location.
If you find matching artisans in the user's location, return them.
If, and only if, there are NO artisans with the right skills in the user's location, you may fallback to recommending artisans from other locations who have the right skills.

Respond STRICTLY with a valid JSON array of objects (and nothing else, no markdown fences).
Format exactly like this:
[
  { 
    "artisanId": "id_here", 
    "reason": "Short 1-sentence explanation of why they are a good fit based on the item needing repair.",
    "outOfLocation": true // Boolean: set to true ONLY if you are recommending them from a different location because no suitable local artisans were found, otherwise false.
  }
]`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let textResponse = result.response.text().trim();
        
        // Strip markdown backticks if Gemini includes them
        if (textResponse.startsWith('```json')) {
            textResponse = textResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (textResponse.startsWith('```')) {
            textResponse = textResponse.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const matches = JSON.parse(textResponse);

        return res.status(200).json({ matches });
    } catch (err) {
        console.error("Error in AI Match:", err);
        return res.status(500).json({ message: "Error running AI Match algorithm", details: err.message });
    }
};

const SERVICE_KEYWORDS = [
    { service: "mechanic", keywords: ["car", "engine", "vehicle", "auto", "truck", "battery", "brake", "tire", "tyre"] },
    { service: "plumber", keywords: ["pipe", "leak", "sink", "toilet", "bath", "tap", "faucet", "plumbing", "drain"] },
    { service: "electrician", keywords: ["wiring", "power", "electric", "socket", "outlet", "breaker", "fuse", "light"] },
    { service: "carpenter", keywords: ["wood", "door", "cabinet", "furniture", "table", "chair", "wardrobe"] },
    { service: "welder", keywords: ["weld", "metal", "gate", "iron", "steel"] },
    { service: "technician", keywords: ["phone", "laptop", "computer", "screen", "tv", "television", "printer"] },
    { service: "tailor", keywords: ["cloth", "dress", "sew", "stitch", "shirt", "zip", "fashion"] },
    { service: "shoe-maker", keywords: ["shoe", "sole", "boot", "sandal"] },
    { service: "painter", keywords: ["paint", "wall", "ceiling", "color", "renovation"] },
    { service: "jeweler", keywords: ["ring", "necklace", "bracelet", "jewel", "gold", "silver"] }
];

const inferServiceFromProblem = (problemDescription = "") => {
    const text = String(problemDescription).toLowerCase();
    for (const entry of SERVICE_KEYWORDS) {
        if (entry.keywords.some(keyword => text.includes(keyword))) {
            return entry.service;
        }
    }
    return null;
};

import { GoogleGenerativeAI } from "@google/generative-ai";
import Artisan from "../models/artisan.model.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const aiChat = async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: "Messages array is required" });
        }

        const systemPrompt = `You are 'FixrBot', a helpful assistant for the Fixr repair marketplace. Your job is to help customers figure out what kind of artisan they need (e.g., Plumber vs Electrician), answer basic queries, and guide them on how to book on the platform. Keep your responses friendly, very concise, and directly helpful. Do not provide actual DIY repair instructions for safety reasons - always recommend an artisan. When suggesting artisans from your search, format their names as markdown links to their profiles using this exact syntax: [Name](/artisan/id). For example: "I recommend [John Doe](/artisan/65abc123...)."`;

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
                
                // Fetch top 3 matches (in a real scenario, applying the .ipynb ranking logic here)
                const artisans = await Artisan.find(query).limit(3).lean();
                
                let matches = artisans.map(a => {
                    const avgRating = a.reviews?.length ? (a.reviews.reduce((sum, r) => sum + r.rating, 0) / a.reviews.length).toFixed(1) : "New";
                    return {
                        name: `${a.firstName} ${a.lastName}`,
                        service: a.serviceRendered,
                        rating: avgRating,
                        id: a._id.toString(),
                        city: a.city
                    };
                });
                
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

        // Fetch approved artisans
        const artisans = await Artisan.find(
            { applicationStatus: "approved" }, 
            '_id firstName lastName serviceRendered serviceDescription city state reviews'
        ).lean();

        if (!artisans || artisans.length === 0) {
            return res.status(200).json({ matches: [], message: "No verified artisans available." });
        }

        // Build a lightweight artisan list for the AI to read
        const artisanList = artisans.map(a => {
            const avgRating = a.reviews?.length 
                ? a.reviews.reduce((sum, r) => sum + r.rating, 0) / a.reviews.length 
                : 0;
            
            return {
                id: a._id.toString(),
                name: `${a.firstName} ${a.lastName}`,
                service: a.serviceRendered,
                bio: a.serviceDescription,
                city: a.city,
                avgRating: avgRating.toFixed(1),
                totalReviews: a.reviews?.length || 0
            };
        });

        const prompt = `A user needs an artisan for the following problem: "${problemDescription}". 
The user is located in: "${location || 'Not specified'}".

Here is the JSON list of available verified artisans:
${JSON.stringify(artisanList, null, 2)}

Analyze the user's problem, focusing heavily on the item that needs repair. Pick the Top 3 best matching artisans from the list based primarily on how well their "service" or "bio" matches the item needing repair. 
You may consider "city" and "avgRating" as secondary bonuses, but DO NOT safely exclude artisans just because their location doesn't match perfectly. If there are no perfect matches, just return the next closest related artisans.

Respond STRICTLY with a valid JSON array of objects (and nothing else, no markdown fences).
Format exactly like this:
[
  { "artisanId": "id_here", "reason": "Short 1-sentence explanation of why they are a good fit based on the item needing repair." }
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

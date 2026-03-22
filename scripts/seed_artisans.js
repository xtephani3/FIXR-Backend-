import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Artisan from "../models/artisan.model.js";
import Auth from "../models/auth.model.js";

dotenv.config();

const DB_URL = process.env.MONGO_URI || "mongodb://localhost:27017/fixr";
const DEFAULT_PASS = await bcrypt.hash("Artisan@123", 10);

const CITIES = ["Lagos", "Enugu", "Port Harcourt", "Kano", "Abuja", "Ibadan", "Kaduna"];
const SERVICES = ["technician", "jeweler", "electrician", "carpenter", "tailor", "plumber", "painter", "mechanic"];
const AVAILABILITIES = ["Available", "Busy", "Offline"];

const firstNames = ["Chukwuemeka", "Amina", "Babatunde", "Ngozi", "Emeka", "Fatimah", "Segun", "Hadiza", "Chinedu", "Abiodun", "Oluwaseun", "Kelechi", "Zainab", "Olumide", "Chika", "Nnamdi", "Blessing", "Tunde", "Aisha", "Obinna"];
const lastNames = ["Okafor", "Yusuf", "Adeyemi", "Eze", "Nwachukwu", "Suleiman", "Balogun", "Musa", "Obiora", "Fashola", "Ogunleye", "Okeke", "Abubakar", "Olawale", "Nwosu", "Uche", "Idris", "Bakare", "Danjuma", "Igwe"];

const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// The 10 known artisans from the dataset mapped with Nigerian names corresponding to the structure
const initialArtisans = [
  { firstName: "Chukwuemeka", lastName: "Okafor", serviceRendered: "painter", yearsOfExperience: 9, rating: 3.96, completedJobs: 743, complaintRate: 0.100, availability: "Busy", city: "Kano" },
  { firstName: "Amina", lastName: "Yusuf", serviceRendered: "tailor", yearsOfExperience: 10, rating: 4.03, completedJobs: 543, complaintRate: 0.016, availability: "Offline", city: "Lagos" },
  { firstName: "Babatunde", lastName: "Adeyemi", serviceRendered: "technician", yearsOfExperience: 24, rating: 4.98, completedJobs: 235, complaintRate: 0.038, availability: "Busy", city: "Abuja" },
  { firstName: "Ngozi", lastName: "Eze", serviceRendered: "carpenter", yearsOfExperience: 5, rating: 3.53, completedJobs: 731, complaintRate: 0.018, availability: "Available", city: "Enugu" },
  { firstName: "Emeka", lastName: "Nwachukwu", serviceRendered: "carpenter", yearsOfExperience: 23, rating: 3.60, completedJobs: 927, complaintRate: 0.063, availability: "Offline", city: "Kano" },
  { firstName: "Fatimah", lastName: "Suleiman", serviceRendered: "technician", yearsOfExperience: 15, rating: 3.75, completedJobs: 768, complaintRate: 0.062, availability: "Busy", city: "Ibadan" },
  { firstName: "Segun", lastName: "Balogun", serviceRendered: "technician", yearsOfExperience: 17, rating: 4.59, completedJobs: 412, complaintRate: 0.013, availability: "Available", city: "Lagos" },
  { firstName: "Hadiza", lastName: "Musa", serviceRendered: "tailor", yearsOfExperience: 18, rating: 4.40, completedJobs: 703, complaintRate: 0.066, availability: "Offline", city: "Ibadan" },
  { firstName: "Chinedu", lastName: "Obiora", serviceRendered: "tailor", yearsOfExperience: 14, rating: 3.18, completedJobs: 205, complaintRate: 0.093, availability: "Available", city: "Kano" },
  { firstName: "Abiodun", lastName: "Fashola", serviceRendered: "technician", yearsOfExperience: 2, rating: 4.15, completedJobs: 401, complaintRate: 0.137, availability: "Offline", city: "Kano" }
];

// Generate the remaining 40 to match distributions closely
for (let i = 0; i < 40; i++) {
  initialArtisans.push({
    firstName: randomChoice(firstNames),
    lastName: randomChoice(lastNames),
    serviceRendered: randomChoice(SERVICES),
    yearsOfExperience: Math.floor(randomRange(1, 25)),
    rating: Number(randomRange(3.0, 5.0).toFixed(2)),
    completedJobs: Math.floor(randomRange(10, 1000)),
    complaintRate: Number(randomRange(0.0, 0.15).toFixed(3)),
    availability: randomChoice(AVAILABILITIES),
    city: randomChoice(CITIES)
  });
}

const seedDatabase = async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to MongoDB using:", DB_URL.split('@').pop());

        // Target all seeded mock auth credentials (using @fixr.ng domain) to dynamically map back to artisans 
        const mockAuths = await Auth.find({ email: /@fixr\.ng$/ });
        const mockAuthIds = mockAuths.map(auth => auth._id);
        
        await Artisan.deleteMany({ auth: { $in: mockAuthIds } });
        await Auth.deleteMany({ _id: { $in: mockAuthIds } });
        console.log(`Deep wiped ${mockAuthIds.length} old mock artisans and auth credential records for a clean slate.`);

        let createdCount = 0;

        for (const [index, a] of initialArtisans.entries()) {
            const emailIdentifier = `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}${index}@fixr.ng`;
            
            // Skip duplicates safely
            const exists = await Auth.findOne({ email: emailIdentifier });
            if (exists) continue;

            const auth = await Auth.create({
                email: emailIdentifier,
                password: DEFAULT_PASS,
                userModel: "Artisan",
            });

            const cRate = a.complaintRate ?? Number(randomRange(0.0, 0.15).toFixed(3));

            const artisan = await Artisan.create({
                auth: auth._id,
                firstName: a.firstName,
                lastName: a.lastName,
                serviceRendered: a.serviceRendered,
                yearsOfExperience: a.yearsOfExperience,
                completedJobs: a.completedJobs,
                complaintRate: cRate,
                availability: a.availability,
                city: a.city,
                state: a.city, // using city as state for simplicity
                applicationStatus: "approved",
                passportImg: "https://placehold.co/400x400/1a1a2e/ffffff?text=FIXR",
                phoneNumber: `0803123${String(index).padStart(4, '0')}`,
                serviceDescription: `Professional ${a.serviceRendered} based in ${a.city} with ${a.yearsOfExperience} years of experience.`,
                reviews: [
                    {
                        comment: `Reliable and hardworking ${a.serviceRendered}.`,
                        rating: a.rating,
                        tags: ["Professional", "Timely"],
                        createdAt: new Date()
                    }
                ]
            });

            // Back-fill the mapping safely
            await Auth.findByIdAndUpdate(auth._id, { userId: artisan._id });
            createdCount++;
        }

        console.log(`Successfully seeded ${createdCount} strictly bound artisans into the cloud DB.`);

    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed");
    }
};

seedDatabase();

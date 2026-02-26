  // "seed:artisans": "node seeds/seedArtisans.js" - found in package.json file
// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import dotenv from "dotenv";
// import { fileURLToPath } from "url";
// import path from "path";

// dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

// import Auth from "../models/auth.model.js";
// import Artisan from "../models/artisan.model.js";

// // ---------------------------------------------------------------------------
// // Seed data – 10 realistic Nigerian artisan profiles
// // ---------------------------------------------------------------------------
// const artisanProfiles = [
//   {
//     firstName: "Chukwuemeka",
//     lastName: "Okafor",
//     email: "chukwuemeka.okafor@fixr.ng",
//     phoneNumber: "08031234001",
//     city: "Enugu",
//     state: "Enugu",
//     serviceRendered: "mechanic",
//     serviceDescription: "Expert auto mechanic specialising in engine overhauls, diagnostics, and general vehicle repairs for all car brands.",
//   },
//   {
//     firstName: "Amina",
//     lastName: "Yusuf",
//     email: "amina.yusuf@fixr.ng",
//     phoneNumber: "08031234002",
//     city: "Kano",
//     state: "Kano",
//     serviceRendered: "tailor",
//     serviceDescription: "Skilled fashion tailor with over 8 years of experience in native attires, corporate suits, and casual wear for men and women.",
//   },
//   {
//     firstName: "Babatunde",
//     lastName: "Adeyemi",
//     email: "babatunde.adeyemi@fixr.ng",
//     phoneNumber: "08031234003",
//     city: "Ibadan",
//     state: "Oyo",
//     serviceRendered: "electrician",
//     serviceDescription: "Certified electrician handling residential and commercial wiring, fault-finding, inverter installation, and general electrical maintenance.",
//   },
//   {
//     firstName: "Ngozi",
//     lastName: "Eze",
//     email: "ngozi.eze@fixr.ng",
//     phoneNumber: "08031234004",
//     city: "Owerri",
//     state: "Imo",
//     serviceRendered: "plumber",
//     serviceDescription: "Professional plumber experienced in pipe laying, burst-pipe repair, bathroom fitting, and drainage system maintenance.",
//   },
//   {
//     firstName: "Emeka",
//     lastName: "Nwachukwu",
//     email: "emeka.nwachukwu@fixr.ng",
//     phoneNumber: "08031234005",
//     city: "Asaba",
//     state: "Delta",
//     serviceRendered: "carpenter",
//     serviceDescription: "Versatile carpenter specialising in custom furniture, wooden flooring, door frames, and interior woodwork finishing.",
//   },
//   {
//     firstName: "Fatimah",
//     lastName: "Suleiman",
//     email: "fatimah.suleiman@fixr.ng",
//     phoneNumber: "08031234006",
//     city: "Abuja",
//     state: "FCT",
//     serviceRendered: "technician",
//     serviceDescription: "Electronics technician proficient in phone repairs, laptop servicing, TV repairs, and home appliance troubleshooting.",
//   },
//   {
//     firstName: "Segun",
//     lastName: "Balogun",
//     email: "segun.balogun@fixr.ng",
//     phoneNumber: "08031234007",
//     city: "Lagos",
//     state: "Lagos",
//     serviceRendered: "welder",
//     serviceDescription: "Expert welder with experience in structural steel fabrication, gate and burglary-proof construction, and general metal works.",
//   },
//   {
//     firstName: "Hadiza",
//     lastName: "Musa",
//     email: "hadiza.musa@fixr.ng",
//     phoneNumber: "08031234008",
//     city: "Kaduna",
//     state: "Kaduna",
//     serviceRendered: "tailor",
//     serviceDescription: "Creative fashion designer and tailor offering bridal wear, bridesmaid dresses, and everyday corporate and casual outfits.",
//   },
//   {
//     firstName: "Chinedu",
//     lastName: "Obiora",
//     email: "chinedu.obiora@fixr.ng",
//     phoneNumber: "08031234009",
//     city: "Port Harcourt",
//     state: "Rivers",
//     serviceRendered: "electrician",
//     serviceDescription: "Qualified electrical engineer offering solar panel installation, industrial electrical work, and smart home automation solutions.",
//   },
//   {
//     firstName: "Abiodun",
//     lastName: "Fashola",
//     email: "abiodun.fashola@fixr.ng",
//     phoneNumber: "08031234010",
//     city: "Abeokuta",
//     state: "Ogun",
//     serviceRendered: "shoe-maker",
//     serviceDescription: "Skilled cobbler and shoe designer crafting bespoke leather footwear, handbags, and offering premium shoe repair services.",
//   },
// ];

// // A placeholder image URL used for passportImg and cv fields
// const PLACEHOLDER_IMG = "https://placehold.co/400x400/1a1a2e/ffffff?text=FIXR";
// const PLACEHOLDER_CV   = "https://placehold.co/600x800/1a1a2e/ffffff?text=CV";

// const DEFAULT_PASSWORD = "Artisan@123";

// // ---------------------------------------------------------------------------
// // Main seeder
// // ---------------------------------------------------------------------------
// async function seed() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("✅  MongoDB connected");

//     const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

//     let created = 0;
//     let skipped = 0;

//     for (const profile of artisanProfiles) {
//       // Skip if the auth record already exists (idempotent seeding)
//       const existing = await Auth.findOne({ email: profile.email });
//       if (existing) {
//         console.log(`⚠️   Skipping ${profile.email} – already exists`);
//         skipped++;
//         continue;
//       }

//       // 1. Create Auth record first (without userId – we'll back-fill it)
//       const auth = await Auth.create({
//         email: profile.email,
//         password: hashedPassword,
//         userModel: "Artisan",
//       });

//       // 2. Create the Artisan document
//       const artisan = await Artisan.create({
//         auth: auth._id,
//         firstName: profile.firstName,
//         lastName: profile.lastName,
//         phoneNumber: profile.phoneNumber,
//         city: profile.city,
//         state: profile.state,
//         serviceRendered: profile.serviceRendered,
//         serviceDescription: profile.serviceDescription,
//         passportImg: PLACEHOLDER_IMG,
//         cv: PLACEHOLDER_CV,
//         applicationStatus: "approved",
//         loggedIn: false,
//       });

//       // 3. Back-fill the userId on the Auth record
//       await Auth.findByIdAndUpdate(auth._id, { userId: artisan._id });

//       console.log(`✅  Created artisan: ${profile.firstName} ${profile.lastName} <${profile.email}>`);
//       created++;
//     }

//     console.log(`\n🌱  Seeding complete. Created: ${created}, Skipped: ${skipped}`);
//   } catch (err) {
//     console.error("❌  Seeding failed:", err);
//   } finally {
//     await mongoose.disconnect();
//     console.log("🔌  MongoDB disconnected");
//     process.exit(0);
//   }
// }

// seed();

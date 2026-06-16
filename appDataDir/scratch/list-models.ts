import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("No API key found in GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_API_KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("Fetching available models...");
        // This is a workaround since the SDK doesn't natively expose listModels directly on the client instance in some versions
        // We will make a direct fetch request using the API key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!response.ok) {
            console.error("Failed to fetch models:", response.statusText);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("\n--- Available Models ---");
        
        const models = data.models || [];
        // Filter out tuned models and display only the core ones
        const coreModels = models.filter((m: any) => m.name.includes("gemini"));

        coreModels.forEach((model: any) => {
            console.log(`- ${model.name.replace('models/', '')}`);
            console.log(`  Description: ${model.description}`);
            console.log(`  Supported Generation Methods: ${model.supportedGenerationMethods.join(', ')}`);
            console.log('---');
        });
        
        console.log(`\nTotal Gemini models found: ${coreModels.length}`);
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();

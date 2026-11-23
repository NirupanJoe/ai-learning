import "dotenv/config";
import { initChatModel, tool } from "langchain";
import config from "./config/index.js";
import * as z from "zod";

console.log("Model:", config.llmModel);
console.log("ModelProvider:", config.llmModelProvider);

const Movies = z.object({
    title: z.string().describe('The title of the movie'),
    year: z.number().describe('The year the movie was released'),
    director: z.string().describe('The director of the movie'),
    rating: z.number().describe('The movies rating out of 10')
})


const model = await initChatModel(config.llmModel, {
    modelProvider: config.llmModelProvider,
    apiKey: config.llmApiKey,
})

const modelWithStructure = model.withStructuredOutput(Movies, { includeRaw: true })

const response = await modelWithStructure.invoke('Provide details about the movie Inception')

console.log(response)
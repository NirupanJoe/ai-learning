import "dotenv/config";
import { initChatModel } from "langchain";
import config from "./config/index.js";

console.log("Model:", config.llmModel);
console.log("ModelProvider:", config.llmModelProvider);

const llm = await initChatModel(config.llmModel, {
    modelProvider: config.llmModelProvider,
    apiKey: config.llmApiKey,
});

const response = await llm.invoke("Why do parrots talk?");

console.log(response.content);
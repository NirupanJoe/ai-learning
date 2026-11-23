import "dotenv/config";
import { initChatModel, tool } from "langchain";
import config from "./config/index.js";
import * as z from "zod";
import { ToolMessage, HumanMessage } from "@langchain/core/messages";

console.log("Model:", config.llmModel);
console.log("ModelProvider:", config.llmModelProvider);

const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);

const model = await initChatModel(config.llmModel, {
    modelProvider: config.llmModelProvider,
    apiKey: config.llmApiKey,
});
const llm = model.bindTools([getWeather]);

const response = await llm.invoke("What's the weather in Coimbator?");

if (response.tool_calls?.length) {
    const toolCall = response.tool_calls[0];

    const toolResult = await getWeather.invoke(toolCall.args);

    const finalResponse = await model.invoke([
        new HumanMessage("What's the weather in Coimbator?"),
        response,
        new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
        }),
    ]);

    console.log(finalResponse.content);
} else {
    console.log(response.content);
}

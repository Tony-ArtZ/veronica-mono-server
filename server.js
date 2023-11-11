import express, { response } from "express";
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import { prompt } from "./utils/prompt.js";
import fetch from "node-fetch";
import { getRefreshToken, spotifyApp } from "./spotify-server/index.js";
import { databaseServer } from "./database-server/index.js";
import chalk from "chalk";
import mongoose from "mongoose";
import { httpServer, wsSendMessage } from "./web-socket-server/index.js";
import { CircularBuffer } from "./utils/ciruclar-buffer.js";
import { getTrainStatus } from "./functions/trainStatus.js";
import openAiConfig from "./utils/openAiConfig.js";
dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
const maxMessageAmount = process.env.MESSAGE_MEMORY || 10;
const PORT = process.env.SPOTIFY_PORT || 8080;
const MongoPORT = process.env.MONGO_DB_PORT || 8080;

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const promptObject = {
  role: "system",
  content: prompt,
};

const message = new CircularBuffer(maxMessageAmount);

//Open AI GPT chatCompletion instance
const openAi = new OpenAIApi(config);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware to handle both types of data
app.use((req, res, next) => {
  // Check if the request's content type is URL-encoded
  if (req.is("application/x-www-form-urlencoded")) {
    // Manually parse the URL-encoded data
    req.body = req.body || {};
    for (let key in req.query) {
      req.body[key] = req.query[key];
    }
  }

  next();
});

app.get("/", (req, res) => {
  res.send("Invalid Method");
});

app.get("/clear", (req, res) => {
  message.clear();
  res.send("Memory Cleared");
});

const addToMemory = (data) => {
  message.push(data);
};

const getReply = () => {
  return new Promise((res) => {
    openAi
      .createChatCompletion({
        ...openAiConfig,
        messages: [promptObject, ...message.toArray()],
      })
      .then((apiRes) => {
        if (
          apiRes.data.choices[0].message.function_call?.name ===
            "sendMessageWithAnimation" &&
          !message.content
        ) {
          const message = sendMessageWithAnimation(
            apiRes.data.choices[0].message.function_call.arguments
          );
          addToMemory(message);
        } else {
          addToMemory(apiRes.data.choices[0].message);
        }
        res(apiRes.data.choices[0].message);
      });
  });
};

const saveMemory = async (dataJSON) => {
  try {
    const responseJSON = JSON.parse(dataJSON);
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${responseJSON.data}`)
    );
    const response = await fetch(
      `http:/localhost:${process.env.MONGO_DB_PORT}/memory`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: responseJSON.data,
          tags: responseJSON.tags
            .split(",")
            .map((string) => string.toLowerCase().trim()),
          category: responseJSON.category,
        }),
      }
    );
    const dataResponse = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(dataResponse)}`)
    );
    addToMemory({
      role: "function",
      name: "saveMemory",
      content: "successfully saved!",
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const loadMemory = async (dataJSON) => {
  try {
    const responseJSON = JSON.parse(dataJSON);
    // console.log(
    //   chalk.blueBright(`Veronica_Server : `) +
    //     chalk.white(`${responseJSON.tags}`)
    // );
    const response = await fetch(
      `http:/localhost:${process.env.MONGO_DB_PORT}/memory`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: [responseJSON.tags.toLowerCase()],
          category: responseJSON.category,
        }),
      }
    );
    const data = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(data)}`)
    );

    addToMemory({
      role: "function",
      name: "loadMemory",
      content: "here are all the data entries, tell the user this :" + JSON.stringify(data),
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const getTodo = async () => {
  try {
    const response = await fetch(
      `http:/localhost:${process.env.MONGO_DB_PORT}/todo`
    );
    const data = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(data)}`)
    );
    const date = new Date();

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    addToMemory({
      role: "function",
      name: "getTodo",
      content:
        `today's date is ${day}-${month}-${year}. tasks are:` +
        JSON.stringify(data),
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const createTodo = async (data) => {
  try {
    const responseJSON = JSON.parse(data);
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${responseJSON.task}`)
    );
    const response = await fetch(
      `http:/localhost:${process.env.MONGO_DB_PORT}/todo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: responseJSON.task,
          dueDate: responseJSON.dueDate,
        }),
      }
    );
    const dataResponse = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(dataResponse)}`)
    );
    addToMemory({
      role: "function",
      name: "createTodo",
      content: "successfully created todo!",
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const deleteTodo = async (data) => {
  try {
    const responseJSON = JSON.parse(data);
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${responseJSON.task}`)
    );
    const response = await fetch(
      `http:/localhost:${process.env.MONGO_DB_PORT}/todo`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: responseJSON.index }),
      }
    );
    const dataResponse = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(dataResponse)}`)
    );
    addToMemory({
      role: "function",
      name: "deleteTodo",
      content: "successfully deleted todo!",
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const getWeather = async () => {
  try {
    const response = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_KEY}&q=bhubaneshwar`
    );
    const dataResponse = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white("Weather Data :", JSON.stringify(dataResponse))
    );
    const content = "tell the user this info :" + JSON.stringify(dataResponse);

    addToMemory({
      role: "function",
      name: "getWeather",
      content,
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const spotifyAction = async (actionJSON) => {
  try {
    const action = JSON.parse(actionJSON).action;
    const response = await fetch(
      `http:/localhost:${process.env.SPOTIFY_PORT}/next`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );

    const data = await response.json();
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(data)}`)
    );

    addToMemory({
      role: "function",
      name: "spotifyAction",
      content:
        JSON.stringify(data) +
        "do not call any animation function, reply with success message",
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const spotifyRandomSong = async (genreJSON) => {
  try {
    const genre = JSON.parse(genreJSON).genre;
    console.log(
      chalk.blueBright(`Veronica_Server : `) + chalk.white(`Genre : ${genre}`)
    );
    const response = await fetch(
      `http:/localhost:${process.env.SPOTIFY_PORT}/next`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "randomSong", genre }),
      }
    );

    const data = await response.json();
    const content =
      "now playing" +
      JSON.stringify(data) +
      "song playing, do not call any animation function, reply with just the name of song and artist provided";
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(content)}`)
    );

    addToMemory({
      role: "function",
      name: "spotifyRandomSong",
      content,
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const spotifySearchSong = async (queryJSON) => {
  try {
    const query = JSON.parse(queryJSON).query;
    console.log(
      chalk.blueBright(`Veronica_Server : `) + chalk.white(`Query : ${query}`)
    );
    const response = await fetch(
      `http:/localhost:${process.env.SPOTIFY_PORT}/next`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "searchSong", query }),
      }
    );

    const data = await response.json();
    const content =
      "now playing" +
      JSON.stringify(data) +
      "song playing, do not call any animation function, reply with just the name of song and artist provided";
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        chalk.white(`${JSON.stringify(content)}`)
    );

    addToMemory({
      role: "function",
      name: "spotifySearchSong",
      content,
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const deviceAction = async (actionJSON) => {
  const action = JSON.parse(actionJSON).action;
  try {
    const data = wsSendMessage(action);
    addToMemory({
      role: "function",
      name: "deviceAction",
      content:
        JSON.stringify(data) +
        " please format the json and tell this to the user",
    });
  } catch (error) {
    addToMemory({
      role: "system",
      content: "tell the user something went wrong",
    });
  }
  const reply = await getReply();
  return reply;
};

const getTrainLiveStatus = async (args) => {
  try {
    const argsParsed = JSON.parse(args);

    const trainNo = argsParsed.trainNo || 18451;
    let date;

    if (argsParsed.date) {
      date = argsParsed.date;
    } else {
      //Get current date in the format of YYMMDD if no date specified
      const today = new Date().toISOString().split("T")[0].split("-");
      date = today[0] + today[1] + today[2];
    }

    const response = await getTrainStatus(trainNo, date);
    if (response.error) {
      throw response.error;
    }

    addToMemory({
      role: "function",
      name: "getTrainLiveStatus",
      content: `tell the user this info without any function call, Train Name: '${response.trainName}', Status: '${response.trainContent}'`,
    });
    const reply = await getReply();
    return reply;
  } catch (error) {
    addToMemory({
      role: "function",
      name: "getTrainLiveStatus",
      content: `Something went wrong.`,
    });
    return "My apologies, Something seems to have gone wrong. Please try again later";
  }
};

const sendMessageWithAnimation = async (animationJSON) => {
  const { animationName, content } = JSON.parse(animationJSON);
  addToMemory({
    role: "function",
    name: "sendMessageWithAnimation",
    content,
  });

  return { role: "assistant", content, animation: animationName };
};

const functions = {
  loadMemory,
  saveMemory,
  getTodo,
  createTodo,
  deleteTodo,
  getWeather,
  spotifyAction,
  spotifyRandomSong,
  spotifySearchSong,
  deviceAction,
  getTrainLiveStatus,
  sendMessageWithAnimation,
};

app.get("/ping", (req, res) => {
  res.send("Pong!");
});

app.post("/", async (req, res) => {
  addToMemory({
    role: "user",
    content: req.body.message,
  });
  const response = await getReply();
  console.log(
    chalk.blueBright(`Veronica_Server : `) +
      chalk.white(`${JSON.stringify(response)}`)
  );
  if (response.function_call) {
    const functionToExecute = functions[response.function_call.name];
    const parameters = response.function_call.arguments;
    console.log(
      chalk.blueBright(`Veronica_Server : `) +
        // chalk.yellow(`Function: `) + functionToExecute +
        chalk.green(`Parameters: `) +
        parameters
    );
    functionToExecute(parameters).then((memoryResponse) => {
      res.json(memoryResponse);
      console.log(
        chalk.blueBright(`Veronica_Server : `) +
          chalk.white(`${JSON.stringify(memoryResponse)}`)
      );
    });
  } else {
    res.json(response);
  }
});

httpServer.on("request", app);

httpServer.listen(port, () => {
  console.log(chalk.blueBright(chalk.bold(`Main Server started on ${port}`)));
  mongooseConnect();
});

//Host MongoDB first and if it connects successfully then connect to other services
const mongooseConnect = async () => {
  console.log(chalk.yellow("Connecting to Database..."));
  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log(chalk.yellow("Connected to Database"));
    databaseServer.listen(MongoPORT, () => {
      console.log(chalk.yellow(`MongoDB Server started on ${MongoPORT}`));
      getRefreshToken();
    });
    spotifyApp.listen(PORT, () =>
      console.log(chalk.green(`Spotify Server started on ${PORT}`))
    );
  } catch (error) {
    console.error(chalk.yellow("Mongo_DB_Error: ") + chalk.red(error));
  }
};

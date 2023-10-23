import express, { response } from "express";
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import { readFile, writeFile } from "fs";
import { prompt } from "./prompt.js";
import fetch from "node-fetch";
import { getRefreshToken, spotifyApp } from "./spotify-server/index.js";
import { databaseServer } from "./database-server/index.js";
import chalk from "chalk";
import mongoose from "mongoose";
import { httpServer, wsSendMessage } from "./web-socket-server/index.js";
import { CircularBuffer } from "./utils/ciruclar-buffer.js";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
const maxMessageAmount = process.env.MESSAGE_MEMORY || 10;
const PORT = process.env.SPOTIFY_PORT || 8080;
const MongoPORT = process.env.MONGO_DB_PORT || 8080;

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openAi = new OpenAIApi(config);

const message = new CircularBuffer(maxMessageAmount);

const promptObject = {
  role: "system",
  content: prompt,
};

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

const addToMemory = (data) => {
  message.push(data);
};

const getReply = () => {
  return new Promise((res) => {
    openAi
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [promptObject, ...message.toArray()],
        temperature: 1.3,
        presence_penalty: 1.2,
        functions: [
          {
            name: "saveMemory",
            description:
              "save an important piece of information permanently for later reference, for example what the user likes or what music the user likes, or who a certain person is and so on",
            parameters: {
              type: "object",
              properties: {
                data: {
                  type: "string",
                  description: "data to save",
                },
                category: {
                  type: "string",
                  description:
                    "what category this memory belongs to, possible values are ['user_details', 'context', 'facts', 'messages']",
                },
                tags: {
                  type: "string",
                  description:
                    "tags related to this memory separated by commas ',', to retrieve it later easily. tags should be generic terms, use as many as you can, at least 5.",
                },
              },
              required: ["tags", "data", "category"],
            },
          },
          {
            name: "loadMemory",
            description:
              "search saved data related to a specific topic to better tune your response for the user, for example remembering, user's favorite food or music or who a certain person is or what context is",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description:
                    "what category this memory could belong to, possible values are ['user_details', 'context', 'facts', 'messages']",
                },
                tags: {
                  type: "string",
                  description:
                    "a single tag that could help filter the required data, they should usually be generic terms",
                },
              },
              required: ["tags", "category"],
            },
          },
          {
            name: "getTodo",
            description:
              "get the list of all the current todos present in the todo list as well todays date to see which tasks are due",
            parameters: {
              type: "object",
              properties: {
                count: {
                  type: "string",
                  description:
                    "total number of data, use 0 for retirieving all",
                },
              },
            },
          },
          {
            name: "createTodo",
            description:
              "create and save a task in a todo list that can be accessed later",
            parameters: {
              type: "object",
              properties: {
                task: {
                  type: "string",
                  description: "name or content of the task",
                },
                dueDate: {
                  type: "string",
                  description:
                    "due date in the format of 'YYYY-MM-DD', if the user specifies",
                },
              },
              required: ["task"],
            },
          },
          {
            name: "deleteTodo",
            description: "delete a task",
            parameters: {
              type: "object",
              properties: {
                index: {
                  type: "number",
                  description: "index of the task, first means 0",
                },
              },
              required: ["index"],
            },
          },
          {
            name: "getWeather",
            description: "delete a task",
            parameters: {
              type: "object",
              properties: {
                count: {
                  type: "number",
                  description:
                    "not necessary, changes the amount of data count",
                },
              },
            },
          },
          {
            name: "spotifyAction",
            description:
              "call this function to control user's music, make sure to include an action depending on what the user asks",
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  description:
                    "possible values are only 'next' to change to the next song and 'details' to get the details of the current song, 'play' to start or resume music, 'pause' to stop music",
                },
              },
            },
            required: ["action"],
          },
          {
            name: "spotifyRandomSong",
            description:
              "call this function to play a random song, make sure to add a genre, if user doesn't specify use 'random' as argument",
            parameters: {
              type: "object",
              properties: {
                genre: {
                  type: "string",
                  description: `possible values are ["acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues", "bossanova", "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical", "club", "comedy", "country", "dance", "dancehall", "death-metal", "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass", "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french", "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge", "guitar", "happy", "hard-rock", "hardcore", "hardstyle", "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie", "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin", "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age", "new-release", "opera", "pagode", "party", "philippines-opm", "piano", "pop", "pop-film", "post-dubstep", "power-pop", "progressive-house", "psych-rock", "punk", "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip", "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter", "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop", "turkish", "work-out", "world-music", "random"] `,
                },
              },
            },
            required: ["genre"],
          },
          {
            name: "spotifySearchSong",
            description:
              "call this function to search and play a specific song",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "name of the song to search for",
                },
              },
            },
            required: ["query"],
          },
          {
            name: "deviceAction",
            description:
              "call this function to control an external device such as laptop",
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  description:
                    "name of the action. possible values are ['shutdown', 'turnon']",
                },
              },
            },
            required: ["action"],
          },
          {
            name: "doAnimation",
            description:
              "call this function before every response unless it is unnecessary. This makes your avatar do an expressive animation like laughing before telling a joke or being angry when user says something mean",
            parameters: {
              type: "object",
              properties: {
                animationName: {
                  type: "string",
                  description:
                    "possible values are 'Laughing', 'Greet', 'Thank', 'Sad', 'Angry', 'Disappointed' and 'Happy'",
                },
              },
            },
            required: ["animationName"],
          },
        ],
      })
      .then((apiRes) => {
        // console.log(
        //   "message :" + JSON.stringify(apiRes.data.choices[0].message)
        // );
        addToMemory(apiRes.data.choices[0].message);
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
          tags: responseJSON.tags.split(",").map((string) => string.trim()),
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
          tags: [responseJSON.tags],
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
      content: JSON.stringify(data),
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

const doAnimation = async (animationJSON) => {
  const animation = JSON.parse(animationJSON).animationName;
  addToMemory({
    role: "function",
    name: "doAnimation",
    content: "Animation done, please continue your response",
  });

  const reply = await getReply();
  const finalResponse = { ...reply };
  // console.log("response before function:", JSON.stringify(finalResponse));
  finalResponse.content += JSON.stringify({ expression: animation });
  // console.log("response after function:", JSON.stringify(finalResponse));
  return finalResponse;
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
  doAnimation,
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

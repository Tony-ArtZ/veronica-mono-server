//openAI chatCompletion functions and other parameters
import * as dotenv from "dotenv";
dotenv.config();

const openAiConfig = {
  model: "gpt-3.5-turbo",
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
            description: "total number of data, use 0 for retirieving all",
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
            description: "not necessary, changes the amount of data count",
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
      description: "call this function to search and play a specific song",
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
      name: "getTrainLiveStatus",
      description:
        "call this function to get the live status of a train",
      parameters: {
        type: "object",
        properties: {
          trainNo: {
            type: "number",
            description:
              "number of the train that the user mentions",
          },
          date: {
            type: "number",
            description:
              "specify the date to get status of train on a specific date. Date must be formatted as YYYYMMDD",
          },
        },
      },
    },
    {
      name: "sendMessageWithAnimation",
      description: "Use this often instead of normal replies. send a reply while doing an animation along with it. for example replying to hi with a message and 'greet' animation",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "this is the reply that will be sent to the user. Must not be empty",
          },
          animationName: {
            type: "string",
            description:
              "name of animation to perform. Possible values are ['Laughing', 'Greet', 'Thank', 'Sad', 'Angry', 'Disappointed' and 'Happy']",
          },
        },
      },
      required: ["content", "animationName"],
    },
  ],
};

export default openAiConfig;
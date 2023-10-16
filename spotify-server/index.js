import express from "express";
import "dotenv/config";
import { getTokenAuthorization, getTokenRefresh } from "./utils/accessToken.js";
import { authRoute } from "./routes/auth.js";
import chalk from "chalk";

const app = express();

let accessToken = null;
let refresh_token = null;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/auth", authRoute);

//Get refresh_token from the database
const getRefreshToken = async () => {
  try {
    const response = await fetch(
      `http:/localhost:${process.env.MONGO_DB_PORT}/storetoken/refreshtoken`
    );
    const data = await response.json();
    const { token } = data;

    refresh_token = token;
    console.log(chalk.green("Acquired Refresh Token!"));
    console.log(chalk.green("Refreshing Access Code..."));
    await getAccessTokenFromRefreshToken();
  } catch (error) {
    console.error(
      chalk.green(`Spotfiy_Server_Error : `) + chalk.red(`${error}`)
    );
  }
};

//Get the access token
const getAccessTokenFromRefreshToken = async () => {
  const tokenResponse = await getTokenRefresh(refresh_token);
  accessToken = tokenResponse.access_token;
  console.log(chalk.green("Access Code refreshed!"));
};

//refresh the access token every one hour
setInterval(getAccessTokenFromRefreshToken, 3500 * 1000);

app.get("/ping", (req, res) => {
  res.send("Pong!");
});

app.post("/next", async (req, res) => {
  const { action } = req.body;
  switch (action) {
    case "next":
      try {
        await nextTrack();
        res.json({ message: "success" });
      } catch (error) {
        res.json({ message: "there was an error" });
      }
      break;
    case "details":
      try {
        const details = await getSongDetails();
        const artists = [];

        details.item.artists.forEach((artist) => {
          artists.push({ name: artist.name });
        });
        const detailsJSON = {
          name: details.item.name,
          popularity: details.item.popularity,
          releaseDate: details.item.album.release_date,
          artists,
        };
        res.json(detailsJSON);
      } catch (error) {
        res.json({ message: "spotify player not active" });
      }
      break;
    case "pause":
      try {
        await pauseSong();
        res.json("success");
      } catch (error) {
        res.json({ message: "there was an error" });
      }
      break;
    case "play":
      try {
        await startSong();
        res.json("success");
      } catch (error) {
        res.json({ message: "there was an error" });
      }
      break;
    case "randomSong":
      try {
        const data = await randomSong(req.body.genre);
        console.log(chalk.green(JSON.stringify(data)));
        res.json(data);
      } catch (error) {
        res.json({ message: "there was an error" });
      }
      break;
    case "searchSong":
      try {
        const searchSongData = await searchSong(req.body.query);
        console.log(chalk.green(JSON.stringify(searchSongData)));
        res.json(searchSongData);
      } catch (error) {
        res.json({ message: "there was an error" });
      }
      break;
  }
});

//functions
const nextTrack = async () => {
  const response = await fetch("https://api.spotify.com/v1/me/player/next", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

const getSongDetails = async () => {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await response.json();

  return data;
};

const pauseSong = async () => {
  const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

const startSong = async () => {
  const response = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

const randomSong = async (genre) => {
  const genreSelected = genre;

  if (genreSelected === "random") {
    const genre = [
      "acoustic",
      "afrobeat",
      "alt-rock",
      "alternative",
      "ambient",
      "anime",
      "black-metal",
      "bluegrass",
      "blues",
      "bossanova",
      "brazil",
      "breakbeat",
      "british",
      "cantopop",
      "chicago-house",
      "children",
      "chill",
      "classical",
      "club",
      "comedy",
      "country",
      "dance",
      "dancehall",
      "death-metal",
      "deep-house",
      "detroit-techno",
      "disco",
      "disney",
      "drum-and-bass",
      "dub",
      "dubstep",
      "edm",
      "electro",
      "electronic",
      "emo",
      "folk",
      "forro",
      "french",
      "funk",
      "garage",
      "german",
      "gospel",
      "goth",
      "grindcore",
      "groove",
      "grunge",
      "guitar",
      "happy",
      "hard-rock",
      "hardcore",
      "hardstyle",
      "heavy-metal",
      "hip-hop",
      "holidays",
      "honky-tonk",
      "house",
      "idm",
      "indian",
      "indie",
      "indie-pop",
      "industrial",
      "iranian",
      "j-dance",
      "j-idol",
      "j-pop",
      "j-rock",
      "jazz",
      "k-pop",
      "kids",
      "latin",
      "latino",
      "malay",
      "mandopop",
      "metal",
      "metal-misc",
      "metalcore",
      "minimal-techno",
      "movies",
      "mpb",
      "new-age",
      "new-release",
      "opera",
      "pagode",
      "party",
      "philippines-opm",
      "piano",
      "pop",
      "pop-film",
      "post-dubstep",
      "power-pop",
      "progressive-house",
      "psych-rock",
      "punk",
      "punk-rock",
      "r-n-b",
      "rainy-day",
      "reggae",
      "reggaeton",
      "road-trip",
      "rock",
      "rock-n-roll",
      "rockabilly",
      "romance",
      "sad",
      "salsa",
      "samba",
      "sertanejo",
      "show-tunes",
      "singer-songwriter",
      "ska",
      "sleep",
      "songwriter",
      "soul",
      "soundtracks",
      "spanish",
      "study",
      "summer",
      "swedish",
      "synth-pop",
      "tango",
      "techno",
      "trance",
      "trip-hop",
      "turkish",
      "work-out",
      "world-music",
    ];
    const randomGenre = Math.floor(Math.random() * genre.length);
    genreSelected = genre[randomGenre];
  }

  const response = await fetch(
    `https://api.spotify.com/v1/recommendations?seed_genres=${genreSelected}&limit=1`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();

  const artists = [];

  if (data?.tracks[0]?.artists) {
    data.tracks[0].artists.forEach((artist) => {
      artists.push({ name: artist.name });
    });
  } else {
    artists.push("unknown");
  }

  const responseArtist = await fetch(
    "https://api.spotify.com/v1/me/player/play",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [data.tracks[0].uri],
      }),
    }
  );

  return { name: data.tracks[0].name, artists };
};

const searchSong = async (query) => {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();

  const uri = data.tracks.items[0].uri;

  const artists = [];

  if (data?.tracks?.items[0]?.artists) {
    data.tracks.items[0].artists.forEach((artist) => {
      artists.push({ name: artist.name });
    });
  } else {
    artists.push("unknown");
  }

  const responseArtist = await fetch(
    "https://api.spotify.com/v1/me/player/play",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [uri],
      }),
    }
  );

  return { name: data.tracks.items[0].name, artists };
};

export { app as spotifyApp, getRefreshToken };

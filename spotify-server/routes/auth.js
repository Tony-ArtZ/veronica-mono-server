import express, { Router } from "express";
import { getTokenAuthorization } from "../utils/accessToken.js";

const router = Router();

router.get("/authorize", async (req, res) => {
  const redirect_uri = "https://veronica-spotify-server.onrender.com/auth/redirect";

  let url = "https://accounts.spotify.com/authorize";
  url += "?client_id=" + process.env.Client_ID;
  url += "&response_type=code";
  url += "&redirect_uri=" + encodeURI(redirect_uri);
  url += "&show_dialog=true";
  url += "&show_dialog=false";
  url +=
    "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
  res.redirect(url);
});

router.get("/redirect", async (req, res) => {
  const { code } = req.query;
  console.log(code);
  const tokenData = await getTokenAuthorization(code);
  console.log(tokenData);
  const { refresh_token } = tokenData;
  const response = await fetch(
    "https://veronica-db-server.onrender.com/storetoken/refreshtoken",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    }
  );

  const data = await response.json();

  res.json(data);
});

export { router as authRoute };

import chalk from "chalk";
import http from "http";
import { WebSocketServer } from "ws";

const server = http.createServer();
const ws = new WebSocketServer({
  server: server,
});

const PORT = process.env.PORT || 8080;

const connetions = new Set();


ws.on("connection", (ws) => {
  console.log(chalk.magenta("Client connected !"));
  connetions.add(ws);
  ws.send("Successfully connected !");
  ws.on("message", (message) => {
    console.log(message.toString());
    ws.send(message.toString());
  });

  ws.on("close", () => {
    connetions.delete(ws);
  });
});
const wsSendMessage = (action) => {
  for(const client of connetions) {
    client.send(action);
  }
  return ({ message: "success" });
};

export { server as httpServer, wsSendMessage}

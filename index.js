const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
// const http = require("http").Server(app);
const http = require("http");
// const io = require("socket.io")(http);
const mongoose = require("mongoose");

const socketIo = require("socket.io");

const server = http.createServer(app);

// Set up socket.io with CORS settings
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    // methods: ["GET", "POST"],
    // allowedHeaders: ["my-custom-header"],
    // credentials: true,
  },
});

const User = require("./models/User");
const { default: axios } = require("axios");

require("dotenv").config();

app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cookieParser());

//connect to DB
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    mongoose.connect(process.env.PRODDB).then(() => {
      console.log("DB is connected");
    });
  } catch (err) {
    console.log(err);
  }
};

connectDB();

//middleware
io.use(async (socket, next) => {
  const sessionID = socket.handshake.auth.id;

  if (
    sessionID !== null &&
    sessionID !== undefined &&
    sessionID !== "undefined"
  ) {
    //getting mongo id and name
    const user = await User.findOne({ name: sessionID?.trim() });

    console.log(sessionID, user);
    if (user) {
      socket.emit("assistant", `Hey ${user.name}, Welcome back`);
      socket.join(user.name);
    } else {
      socket.emit("user-kind", { known: false });
    }
  } else {
    console.log("unknow", socket.id, "yes");

    socket.emit("user-kind", { known: false });
  }
  return next();
});

io.on("connection", (socket) => {
  //events
  socket.on("user-reg", async (data) => {
    if (data !== "" || data !== undefined) {
      const user = await User.findOne({ name: data?.trim() });

      if (user) {
        socket.emit("hello", {
          data: `Hey ${data}, Welcome back`,
          name: data,
        });
        socket.join(user.name);
      } else {
        const user = new User({ name: data });
        await user.save();
        socket.emit("hello", {
          data: `${user.name}, thankyou for coming, what can i help you with`,
          name: user.name,
        });
        socket.join(user.name);
      }
    }
  });

  socket.on("user-chat", async (data) => {
    console.log(data);
    const res = await axios.post(`${process.env.MODEL_API}`, {
      model: "artimus:latest",
      prompt: `${data.id} to the person ${data.transcript}`,
      stream: false,
    });

    console.log("object", res.data?.response);
    socket.emit("assistant", res.data?.response);
  });

  socket.on("message", async (data) => {
    // const check = await axios.post(`${process.env.MODEL_API}`, {
    //   model: "artimus:latest",
    //   prompt: `Verify and Check carefully here, if anyone is intending to send a message, reply with true or false in English for this context - ${data.transcript}. Return true or false in English only, no other words! Ignore your own name - artimus in context`,
    //   stream: false,
    // });
    // console.log(
    //   "messaging",
    //   check.data.response,
    //   check.data.response.includes(true),
    //   data
    // );
    // if (
    //   check.data.response.includes(true) ||
    //   check.data.response.includes("सच")
    // ) {
    //   const res = await axios.post(`${process.env.MODEL_API}`, {
    //     model: "artimus:latest",
    //     prompt: `who is the reciver here? ${data.transcript} - Give name of reciever only, Only Name nothing else, and return name in english only`,
    //     stream: false,
    //   });
    //   const mes = await axios.post(`${process.env.MODEL_API}`, {
    //     model: "artimus:latest",
    //     prompt: `Reframe the message as ${data.id} like ${data.id} is saying then, message is ${data.transcript}, it is sent to ${res.data.response}, return the message context only nothing else!`,
    //     stream: false,
    //   });

    //   if (res.data?.response) {
    //     const rec = await User.findOne({ name: res.data?.response.trim() });

    //     if (rec) {
    //       socket.emit("assistant", `${rec.name} se kehdiya hai`);
    //       socket.to(rec.name).emit(mes);
    //     } else {
    //       socket.emit("assistant", "User mere database mein nahi hai");
    //     }
    //   }
    // } else {
    console.log("chat");
    const res = await axios.post(`${process.env.MODEL_API}`, {
      model: "artimus:latest",
      prompt: `Reply according to instrctions for this - ${data.transcript}`,
      stream: false,
    });

    console.log("chat", res.data?.response);
    socket.emit("assistant", res.data?.response);
    // }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

// http.listen(8998, function () {
//   console.log("Rooms on 8998");
// });
server.listen(8998, function () {
  console.log("Rooms on 8998");
});

import express from "express";

const PORT = 8000;
const app = express();

app.use(express.json());

const users = [
  { id: 1, name: "Budi" },
  { id: 2, name: "Lebron" },
  { id: 3, name: "Jamal" },
];

app.get("/api", (req, res) => {
  res.status(200).send("Welcome to my API");
});

app.get("/users", (req, res) => {
  res.status(200).send(users);
});
app.get("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const userExist = users.find((user) => {
    return user.id === id;
  });
  if (!userExist) {
    return res.status(404).send({ message: "User Not Found" });
  }
  res.status(200).send(userExist);
});

app.patch("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const userExist = users.find((user) => {
    return user.id === id;
  });
  if (!userExist) {
    return res.status(404).send({ message: "User Not Found" });
  }
  userExist.name = req.body.name;
  res.status(200).send({
    message: "User updated successfully",
    data: userExist,
  });
});

app.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);

  const userExist = users.find((user) => {
    return user.id === id;
  });

  if (!userExist) {
    return res.status(404).send({ message: "User Not Found" });
  }

  const index = users.indexOf(userExist);

  users.splice(index, 1);

  res.status(200).send({
    message: "User deleted successfully",
    data: userExist, // optional: buat pamer user mana yang baru dihapus
  });
});

app.post("/users", (req, res) => {
  users.push({
    id: users[users.length - 1].id + 1,
    name: req.body.name,
  });
  res.status(200).send({ message: "add new user succes" });
});

app.use((req, res) => {
  res.status(400).send({ message: "Route Not Found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port : ${PORT}`);
});

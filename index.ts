import http from "http";

const PORT = 8000;

const server = http.createServer((request, response) => {
  if (request.url === "/api" && request.method === "GET") {
    response.writeHead(200);
    response.write("Welcome to My API");
    response.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port : ${PORT}`);
});

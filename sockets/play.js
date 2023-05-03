
const webPlaySocket = (ws, req) => {
  console.log("client connected")
  try {
    // ws.clients(client=>{
    //   client.send(JSON.stringify({name:"maqsood"}));
    // })
    setInterval(() => {
      console.log("sending data")
      ws.send(JSON.stringify({ value: Math.random() }));
    }, 5000);
    // ws.clients.forEach(client => {
    //   client.send(JSON.stringify({name:"maqsood"}));
    // });
    ws.on("message", async function () {
      console.log("working");
      ws.send(JSON.stringify({ result: 1, data: {name:"maqsood"} }));
    });
  } catch (error) {
    console.log("error.message", error);
    ws.send(JSON.stringify({ result: 2, error: "forbidden" }));
  }
};

module.exports = { webPlaySocket };

// Server setup
const express = require("express");
const cors = require("cors");
const app = express();

// Solver handler
const solver = require("./solver.js");
const { response } = require("express");

// Config variables
port = 3008,
solver_endpoint = "truss-solver"

// Set up app
app.use(cors());
app.use(express.json());

// Post request
app.post(`/${solver_endpoint}`, (req, res) => {
    console.log(`Hit: /${solver_endpoint}`);

    // Get the model and the options from the request
    // console.log(`Model received: \n ${JSON.stringify(req.body)}`);
    const model = req.body;

    const response = solver(model);

    res.send(response);
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
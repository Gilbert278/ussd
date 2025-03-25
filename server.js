require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
const port = process.env.PORT || 3000;    

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MySQL Connection
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "ussd",
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Error:", err);
  } else {
    console.log("✅ MySQL Connected");
  }
});

// Create Transactions Table (if it doesn't exist)
const createTableQuery = `    
  CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phoneNumber VARCHAR(20) NOT NULL,
    recipient VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

connection.query(createTableQuery, (err) => {
  if (err) {
    console.error("❌ Error creating transactions table:", err);
  } else {
    console.log("✅ Transactions table ready");
  }
});

// USSD Endpoint
app.post("/ussd", async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  let response = "";
  

  if (text === "") {
    // Initial menu
    response = `CON Welcome to My USSD App
1. Check Balance
2. Send Money
3. Exit`;
  } else if (text === "1") {
    // Check balance (fetch from DB in future)
    response = `END Your balance is $100`;
  } else if (text === "2") {
    // Send Money - Enter recipient number
    response = `CON Enter recipient's phone number:`;
  } else if (text.startsWith("2*")) {
    const inputs = text.split("*");

    if (inputs.length === 2) {
      // User entered recipient number
      response = `CON Enter amount to send:`;
    } else if (inputs.length === 3) {
      // User entered amount
      const recipientNumber = inputs[1];
      const amount = parseFloat(inputs[2]);

      if (!isNaN(amount)) {
        // Save transaction to MySQL
        const insertQuery = `
          INSERT INTO transactions (phoneNumber, recipient, amount)
          VALUES (?, ?, ?)
        `;
        connection.query(insertQuery, [phoneNumber, recipientNumber, amount], (err, results) => {
          if (err) {
            console.error("❌ Error saving transaction:", err);
            response = `END Error processing transaction. Please try again.`;
          } else {
            response = `END You have sent $${amount} to ${recipientNumber}`;
          }
          res.set("Content-Type", "text/plain");
          res.send(response);
        });
        return; // Exit early to avoid sending multiple responses
      } else {
        response = `END Invalid amount. Please try again.`;
      }
    }
  } else if (text === "3") {
    // Exit
    response = `END Thank you for using My USSD App`;
  } else {
    // Invalid input
    response = `END Invalid option. Please try again.`; 
  }

  // Send response back to USSD gateway
  res.set("Content-Type", "text/plain");
  res.send(response);
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on https://myussdapp.onrender.com/ussd`);
}); 
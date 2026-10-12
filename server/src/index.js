import "dotenv/config";
import app from "./app.js";
import { initializeDatabase } from "./database.js";

const { PORT = 5000 } = process.env;
await initializeDatabase();
app.listen(PORT, () => console.log(`MediQueue API listening on port ${PORT}`));

const cron = require("node-cron");
const challengesController = require("../../controllers/challenges");

// Define and schedule the existing cron job (runs every 59 minutes)
cron.schedule("*/59 * * * *", async () => {
  try {
    await challengesController.UpdateOpenChallenges();

    console.log("Open challenges deleted by cron job");
  } catch (error) {
    console.error("Error executing cron job:", error);
  }
});

// Define and schedule the new cron job (runs every 5 minutes)
// cron.schedule("*/5 * * * *", async () => {
//   try {
//     await challengesController.createFakeUsers();
//     await challengesController.createFakeChallenges();
//     console.log("Fake Challenges updated by cronjobs");
//   } catch (error) {
//     console.error("Error executing cron job:", error);
//   }
// });

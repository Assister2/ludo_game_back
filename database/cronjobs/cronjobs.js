const cron = require("node-cron");
const challengesController = require("../../controllers/challenges");
// Define and schedule the cron job
cron.schedule("*/30 * * * * *", async () => {
  try {
    // await challengesController.createFakeUsers();
    console.log(
      "Cron job: challengesController.UpdateOpenChallenges() executed successfully."
    );
  } catch (error) {
    console.error("Error executing cron job:", error);
  }
});

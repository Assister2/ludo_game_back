const cron = require("node-cron");
const challengesController = require("../../controllers/challenges");
// Define and schedule the cron job
cron.schedule("*/2 * * * *", async () => {
  try {
    await challengesController.UpdateOpenChallenges();

    console.log(
      "Cron job: challengesController.UpdateOpenChallenges() executed successfully."
    );
  } catch (error) {
    console.error("Error executing cron job:", error);
  }
});

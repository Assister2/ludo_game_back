const cron = require("node-cron");
const challengeHelper = require("../../helpers/challengeHelper");

// Define and schedule the existing cron job (runs every 59 minutes)
cron.schedule("*/59 * * * *", async () => {
  try {
    await challengeHelper.UpdateOpenChallenges();

    console.log("Open challenges deleted by cron job");
  } catch (error) {
    console.error("Error executing cron job:", error);
  }
});

// Define and schedule the new cron job (runs every 5 minutes)
// cron.schedule("*/5 * * * *", async () => {
//   try {
//     await challengeHelper.createFakeUsers();
//     await challengeHelper.createFakeChallenges();
//     console.log("Fake Challenges updated by cronjobs");
//   } catch (error) {
//     console.error("Error executing cron job:", error);
//   }
// });

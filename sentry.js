// const Sentry = require("@sentry/node");
// // or use es6 import statements
// // import * as Sentry from '@sentry/node';
// if (process.env.NODE_ENV === "production") {
//   Sentry.init({
//     dsn: "https://5b3b721540504a4991d0983d138df582@o4505511314456576.ingest.sentry.io/4505511339032576",

//     // Set tracesSampleRate to 1.0 to capture 100%
//     // of transactions for performance monitoring.
//     // We recommend adjusting this value in production
//     tracesSampleRate: 1.0,
//   });
//   process.on("uncaughtException", (error) => {
//     console.error("Uncaught Exception:", error);
//     Sentry.captureException(error);
//     process.exit(1);
//   });

//   process.on("unhandledRejection", (reason, promise) => {
//     console.error("Unhandled Promise Rejection:", reason);
//     Sentry.captureException(reason);
//     process.exit(1);
//   });
// }
// module.exports = Sentry;

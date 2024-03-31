/**
 * Schedules a cronjob which will automatically download
 * the NYT daily crossword 1 minute after its published and
 * then upload it to your Dropbox.
 *
 * @author Nathan Buchar <hello@nathanbuchar.com>
 * @author Alec Custer <alcuster@icloud.com>
 * @license MIT
 */

const dropbox = require("dropbox");
const https = require("https");
const moment = require("moment");
const path = require("path");

// Instantiate the Dropbox instance.
//
// Set DROPBOX_ACCESS_TOKEN to an access token that you've
// generated for your Dropbox account.
//
// See https://dropbox.tech/developers/generate-an-access-token-for-your-own-account
const dbx = new dropbox.Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN,
});

async function getPuzzleId(date) {
  return new Promise((resolve) => {
    https.get(
      `https://www.nytimes.com/svc/crosswords/v6/puzzle/daily/${date.format(
        "YYYY-MM-DD"
      )}.json`,
      {
        headers: {
          Cookie: process.env.NYT_COOKIE,
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log(`Crossword ID: ${JSON.parse(data).id}`);
          const id = JSON.parse(data).id;
          resolve(id);
        });
      }
    );
  });
}

function getNYTCrossword(date) {
  console.log("Attempting to download crossword...");
  const d = moment(date);

  getPuzzleId(d).then((id) => {
    const req = https.request(
      {
        protocol: "https:",
        host: "www.nytimes.com",
        path: `/svc/crosswords/v2/puzzle/${id}.pdf?southpaw=true`,
        method: "GET",
        headers: {
          Referer: "https://www.nytimes.com/crosswords/archive/daily",
          Cookie: process.env.NYT_COOKIE,
        },
      },
      (res) => {
        if (res.statusCode === 200) {
          const data = [];

          res.on("error", (err) => {
            console.log(err);
          });

          res.on("data", (chunk) => {
            data.push(chunk);
          });

          res.on("end", () => {
            console.log("Successfully downloaded crossword");

            // The file has successfully downloaded. Upload it
            // to Dropbox.
            //
            // Set SUPERNOTE_UPLOAD_PATH to the path where the
            // PDFs should be uploaded on Dropbox. This should
            // look something like "/Supernote/Document/Crosswords".
            dbx
              .filesUpload({
                path: path.join(
                  process.env.SUPERNOTE_UPLOAD_PATH,
                  `${d.format("YYYYMMDD_ddd")}-crossword.pdf`
                ),
                contents: Buffer.concat(data),
              })
              .then((response) => {
                console.log("Successfully uploaded crossword");
                console.log(`Content hash: ${response.result.content_hash}`);
              })
              .catch((err) => {
                console.log("Error writing to dropbox");
                console.log(err);
              });
          });
        } else {
          console.log(
            `Could not get crossword. Status code: ${res.statusCode}`
          );
        }
      }
    );

    req.on("error", (err) => {
      console.log(err);
    });

    req.end();
  });

  // Get the crossword.
  //
  // Set NYT_COOKIE to the return value of `document.cookie`
  // when logged into your account on nytimes.com. This
  // cookie will eventually expire and need to be set again.
}

function getTomorrowsNYTCrossword() {
  const today = new Date();
  const todayNYTime = today.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });

  const tomorrow = new Date(todayNYTime);
  tomorrow.setDate(tomorrow.getDate() + 1);

  getNYTCrossword(tomorrow);
}

getTomorrowsNYTCrossword();

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
const path = require("path");

const dbx = new dropbox.Dropbox({
  clientId: process.env.DROPBOX_CLIENT_ID,
  clientSecret: process.env.DROPBOX_CLIENT_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
});

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

async function getPuzzleId(dateString) {
  return new Promise((resolve) => {
    https.get(
      `https://www.nytimes.com/svc/crosswords/v6/puzzle/daily/${dateString}.json`,
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
          console.log(`Crossword ID for ${dateString}: ${JSON.parse(data).id}`);
          const id = JSON.parse(data).id;
          resolve(id);
        });
      }
    );
  });
}

function getNYTCrossword(date, dryRun = false) {
  console.log("Attempting to download crossword...");

  const dateString = date.toISOString();
  const formattedDateString = dateString.substring(0, dateString.indexOf("T"));

  getPuzzleId(formattedDateString).then((id) => {
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
            if (dryRun) return;

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
                  `${formattedDateString} (${
                    dayNames[new Date(formattedDateString).getDay()]
                  }) Crossword.pdf`
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
}

getNYTCrossword(new Date());

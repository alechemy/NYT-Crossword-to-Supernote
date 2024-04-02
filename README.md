# NYT Crossword to Supernote

Tweaked version of [this script](https://gist.github.com/nathanbuchar/8c7a87a8383ee83c7c636f861b0d86a0)
which fetches the daily NYT crossword and uploads it to Dropbox, for consumption on a Supernote device.

I'm running this as a cron job on [render.com](https://render.com/). The required environment variables can be easily supplied in the Render dashboard.

## Getting a Dropbox refresh token

A Dropbox refresh token is required for the `DROPBOX_REFRESH_TOKEN` environment variable.

1. First create an App in the Dropbox Developer dashboard, and make note of your app id and secret.

2. Then, go to this page in a browser, replacing `<client_id>` with your app's id:

   `https://www.dropbox.com/oauth2/authorize?token_access_type=offline&response_type=code&client_id=<client_id>`

3. Finally, use the resulting token here:

   `curl https://api.dropbox.com/oauth2/token -d code=<token from previous step> -d grant_type=authorization_code -u <client_id>:<client_secret>`

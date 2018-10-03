const {
  config,
  express,
  router,
  csp,
  datamanager,
  nunjucksEnv,
  cache,
} = require('visual-cms.website')('hochzeit', __dirname);
const { PublicAPI } = require('ec.sdk');
const crypto = require('crypto');

const ecUserDM = new PublicAPI(config.datamanagerURL, { noCookie: true });
ecUserDM.setToken(config.accessToken);

async function register(email) {
  const password = crypto.createHash('sha256').update(email).digest('base64');
  const userdm = new PublicAPI(config.datamanagerURL, { noCookie: true  });
  userdm.setClientID('rest');
  const token = await userdm.signup(email, password);
  return token;
}

async function login(email) {
  const password = crypto.createHash('sha256').update(email).digest('base64');
  const userdm = new PublicAPI(config.datamanagerURL, { noCookie: true  });
  userdm.setClientID('rest');
  const token = await userdm.login(email, password);
  return token;
}

async function sendEmailLink(email) {
  const guestList = await ecUserDM.entryList('guest', { email });
  const guest = guestList.getFirstItem();
  const token = crypto.randomBytes(64).toString('base64').replace(/\+/g, '-') // Convert '+' to '-'
  .replace(/\//g, '_') // Convert '/' to '_'
  .replace(/=+$/, '')
  .replace('_', '')
  .replace('-', '');
  await ecUserDM.createEntry('mail_token', {
    recipient: guest.email,
    token,
    account: guest._creator,
    used: null,
  });
  return guest.email;
}

async function loginWithToken(token) {
  const allTokens = await ecUserDM.entryList('mail_token', { token });
  const mailToken = allTokens.getFirstItem();
  if (mailToken.used) {
    throw new Error('token already used');
  }
  mailToken.used = new Date().toISOString();
  await mailToken.save();
  const allGuests = await ecUserDM.entryList('guest', { email: mailToken.recipient });
  const guest = allGuests.getFirstItem();
  return login(guest.email);
}

module.exports = {
  register,
  login,
  sendEmailLink,
  loginWithToken,
}

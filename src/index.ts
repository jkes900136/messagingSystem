import * as functions from 'firebase-functions';
import * as Express from "express"
import * as Cors from "cors"
import * as Logger from "morgan"
import * as admin from 'firebase-admin';

import { databaseURLPath, serviceAccountPath, storageBucket, prefix, PORT } from './config'

var serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURLPath,
  storageBucket: storageBucket
});
const settings = { timestampsInSnapshots: true };
admin.firestore().settings(settings);
const app = Express()

app.use(Cors({ origin: true }));
app.use(Logger("dev"))
app.use(Express.json({ limit: '100mb' }));

import webhook from './chatbotWS'
import bindingWS from './bindingWS'
import DriveCrawler from './driveCrawler'
import authWS from "./authWS"

import healthReportWS from "./healthReport"
import DBsync from './DBsync'
import WorkWS from './workWS'
import MessageRecordWS from "./messageRecordWS"

import pushMessageWS from './pushMessageWS'
import UserWS from "./userWS"
import MemberWS from './memberWS'
import fileWS from './fileWS'
import TemplateWS from "./templateWS"
import PubSubEvent from "./pubSubEvent"
import ReviewMessageWS from "./reviewMessageWS"
app.get(prefix + "/", (req, res) => {
  res.sendStatus(200)
})
app.use(prefix + "/", webhook);
app.use(prefix + "/", bindingWS);
app.use(prefix + "/", DriveCrawler);
app.use(prefix + "/", authWS);

app.use(prefix + "/", healthReportWS)
app.use(prefix + "/", DBsync)
app.use(prefix + "/", WorkWS)
app.use(prefix + "/", MessageRecordWS)

app.use(prefix + "/push", pushMessageWS);
app.use(prefix + "/user", UserWS)
app.use(prefix + "/member", MemberWS)
app.use(prefix + "/file", fileWS);
app.use(prefix + "/template", TemplateWS)
app.use(prefix + "/event", PubSubEvent)
app.use(prefix + "/reviewMessage", ReviewMessageWS)
// exports.webservice = functions.https.onRequest(app);
const port = process.argv[2] || PORT

process.on('SIGINT', function () {
  console.log("Caught interrupt signal");
  process.exit();
});
app.listen(port, function () {
  console.log(`Express server listening on port ${port}!`);
});
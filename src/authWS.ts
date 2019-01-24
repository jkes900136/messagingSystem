import { Router } from "express"
import axios from "axios"
import * as queryString from "querystring"
import * as jwt from "jsonwebtoken"
import * as jws from "jws"
import * as memberService from './services/memberService'
import { jwtSecretKey, uriName, ServerUrlPrefix, lineLoginConfig, wechatAccount } from './config'
import * as admin from 'firebase-admin';


const router = Router()

function generateFirebaseToken(userId) {
    let firebaseUid = userId;
    // admin.auth().dis
    return admin.auth().createCustomToken(firebaseUid);
}

router.post("/verifyLineUser", async (req, res) => {
    const code = req.body.code
    const page = req.body.page
    console.log("----", code + " " + page)
    console.log(queryString.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: lineLoginConfig.redirectUri + (page ? page : "login"),
        client_id: lineLoginConfig.clientId,
        client_secret: lineLoginConfig.clientSecret
    }))

    const lineVerifyResult = await axios.post("https://api.line.me/oauth2/v2.1/token", queryString.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: lineLoginConfig.redirectUri + (page ? page : "login"),
        client_id: lineLoginConfig.clientId,
        client_secret: lineLoginConfig.clientSecret
    }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }).catch(error => {
            console.log("lineVerify failed")
            return null
        })

    if (lineVerifyResult != null) {
        const lineToken = lineVerifyResult.data.id_token
        const profile = jwt.verify(lineToken, lineLoginConfig.clientSecret) as any
        console.log(profile)
        memberService.getMemberByAnyId(profile.sub).then(async snapshot => {
            if (!snapshot.empty) {
                let sales = snapshot.docs[0].data()
                if (!sales.unfollow && sales.isActive) {
                    let firebaseToken = await generateFirebaseToken(sales.lineId).catch(error => {
                        console.log("generateFirebaseToken error:", error)
                    })
                    res.status(200).send({ lineId: sales.lineId, token: firebaseToken, name: sales.name, divsionName: sales.divsionName })
                } else
                    res.status(403).send({ lineId: profile.sub, msg: "member is not active" })
            } else
                res.status(403).send({ lineId: profile.sub, msg: "snapshot is empty" })
        }).catch(error => {
            console.log("verify user error:", error)
            res.status(403).send("verify failed, please retry.")
        })
    } else {
        res.status(403).send("verify failed")
    }
})

router.post("/verifyWechatUser", async (req, res) => {
    const code = req.body.code

    const wechatVerifyResult = await axios.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechatAccount.id}&secret=${wechatAccount.secret}&code=${code}&grant_type=authorization_code`)

    if (wechatVerifyResult != null) {
        const wechatId = wechatVerifyResult.data.openid

        memberService.getMemberByAnyId(wechatId).then(async snapshot => {
            if (!snapshot.empty) {
                let member = snapshot.docs[0].data()
                if (!member.unfollow && member.isActive) {
                    let firebaseToken = await generateFirebaseToken(member.wechatId).catch(error => {
                        console.log("generateFirebaseToken error:", error)
                    })
                    res.status(200).send({ wechatId: member.wechatId, token: firebaseToken, name: member.name, divsionName: member.divsionName })
                } else
                    res.status(403).send({ wechatId: wechatId })
            } else
                res.status(403).send({ wechatId: wechatId })
        }).catch(error => {
            console.log("verify user error:", error)
            res.status(403).send("verify failed, please retry.")
        })
    } else {
        res.status(403).send("verify failed")
    }
})
router.post("/verifyWebUser", async (req, res) => {
    const code = req.body.code
    let firebaseToken = await generateFirebaseToken(code).catch(error => {
        console.log("generateFirebaseToken error:", error)
        res.status(403).send({ error: error })
    })
    res.status(200).send({ token: firebaseToken })

})

router.post("/verifyUser", (req, res) => {
    const accessToken = req.body.accessToken
    jwt.verify(accessToken, jwtSecretKey, (err, result) => {
        if (err) {
            console.log("verifyUser err:", err)
            res.status(403).send("Not Authorized")
        } else {
            console.log("verifyUser result:", result)
            const now = Date.now()

            if (Math.floor(now / 1000) - result.iat < 900) { // in 15 mins
                memberService.getMemberByAnyId(result.sub).then(salesSnapshot => {
                    if (!salesSnapshot.empty) {
                        const newToken = jws.sign({
                            header: { alg: "HS512" },
                            payload: {
                                sub: result.sub,
                                iat: Math.floor(now / 1000) + (15 * 60)
                            },
                            secret: jwtSecretKey
                        })
                        console.log("newToken:", newToken)
                        res.status(200).send(newToken)
                    } else {
                        res.status(403).send("Not Authorized")
                    }
                }).catch(error => {
                    console.log("verifyUser failed:", error)
                    res.status(403).send("Not Authorized")
                })
            } else
                res.status(403).send("Not Authorized")
        }

    })

})
// app.use(ServerUrlPrefix, router)


export default router
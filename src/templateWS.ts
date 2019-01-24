import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import * as messageTemplateService from "./services/messageTemplateService"
import * as catalogService from "./services/catalogService"
import { Catalog, MessageTemplate } from "./model"
import * as XLSX from 'xlsx'

const router = Router()
router.post("/importTemplate", async (req, res) => {
    let base64String = req.body.file;
    let base64Image = base64String.split(';base64,').pop();
    /* data is a node Buffer that can be passed to XLSX.read */
    let workbook = XLSX.read(base64Image, { type: 'base64' });
    let data: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    let userId = ""
    let name: string = ""
    let type: Catalog['type'] = "static"
    let messageTemplateUploads = new Array<{ title: string, content: string, thumb: string }>()
    if (req.body.hasOwnProperty("userId")) {
        userId = req.body.userId
    }
    if (req.body.hasOwnProperty("name")) {
        name = req.body.name
    }
    if (req.body.hasOwnProperty("type")) {
        type = req.body.type
    }
    for (let i = 1; i < data.length; i++) {
        let cols = data[i]
        if (cols.length <= 1) {
            cols[1] = ""
        }
        if (cols.length >= 2) {
            let newData = {
                title: cols[0] || "",
                content: cols[1] || "",
                thumb: cols[2] || ""
            }
            messageTemplateUploads.push({
                title: cols[0].toString().trim(),
                content: cols[1].toString().trim(),
                thumb: cols[2].toString().trim()
            })
        }
    }

    let newCatalog: Catalog = { id: uuidv4(), name: name, messageId: [], userId: userId, index: new Date().getTime(), type: type }
    // let newMessageTemplate: MessageTemplate = { id: uuidv4(), title: "", content: "", thumb: "" }
    const catalogSnapshot = await catalogService.getCatalogByNameAndUserId(name, userId)

    if (catalogSnapshot.length > 0) {

        newCatalog.id = catalogSnapshot[0].id
        newCatalog.messageId = catalogSnapshot[0].messageId
        newCatalog.index = catalogSnapshot[0].index
        newCatalog.type = catalogSnapshot[0].type

    } else {

    }
    for (const messageTemplateUpload of messageTemplateUploads) {
        /**
         * 檢查主檔是否存在
         */
        const messageTemplateSnapshot = await messageTemplateService.getMessageTemplateByContent(messageTemplateUpload.content)

        if (messageTemplateSnapshot.empty) {
            console.log("====不存在====")
            let newMessageTemplate: MessageTemplate = {
                id: uuidv4(),
                title: messageTemplateUpload.title,
                content: messageTemplateUpload.content,
                thumb: messageTemplateUpload.thumb,
                type: ""
            }
            if (newCatalog.messageId.indexOf(newMessageTemplate.id) < 0) {
                newCatalog.messageId.push(newMessageTemplate.id)
            }
            messageTemplateService.setMessageTemplate(newMessageTemplate)
        } else {
            // 若存在則檢查是否更新
            let newMessageTemplate = messageTemplateSnapshot.docs[0].data() as MessageTemplate

            if (messageTemplateUpload.title) {
                newMessageTemplate.title = messageTemplateUpload.title

            }
            // console.log("memberUpload:", memberUpload)
            if (messageTemplateUpload.content) {
                newMessageTemplate.content = messageTemplateUpload.content

            }
            if (messageTemplateUpload.thumb) {
                newMessageTemplate.thumb = messageTemplateUpload.thumb

            }
            if (newCatalog.messageId.indexOf(newMessageTemplate.id) < 0) {
                newCatalog.messageId.push(newMessageTemplate.id)
            }
            messageTemplateService.setMessageTemplate(newMessageTemplate)
        }
    }

    console.log("newCatalog:", newCatalog)

    await catalogService.setCatalog(newCatalog).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })

})

router.get("/getCatalogByTypeAndUserId", async (req, res) => {
    const catalogType = req.query.type
    const userId = req.query.userId

    console.log(catalogType)

    const works = await catalogService.getCatalogByNameAndUserId(catalogType, userId)

    if (works.length != 0) {
        res.status(200).send(works[0])
    } else {
        res.sendStatus(403)
    }

})
router.post("/updateCatalog", async (req, res) => {
    const catalogUpload = req.body as Catalog
    console.log(JSON.stringify(catalogUpload, null, 4))

    if (catalogUpload && catalogUpload != null) {

        const newCatalog: Catalog = {
            ...catalogUpload
        }
        await catalogService.setCatalog(newCatalog)
        res.sendStatus(200)

    } else {
        res.sendStatus(403)
    }

})

router.delete("/deleteCatalog/:catalogId", async (req, res) => {
    const id = req.params.catalogId as string
    await catalogService.deleteCatalog(id).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })
})

router.post("/updateTemplate", async (req, res) => {
    const newTemplate = req.body as MessageTemplate

    console.log(JSON.stringify(newTemplate, null, 4))

    if (newTemplate.content != "") {
        console.log("====建立====", newTemplate.title)
        const newWork: MessageTemplate = {
            ...newTemplate
        }
        await messageTemplateService.setMessageTemplate(newWork)
        res.sendStatus(200)

    } else {
        res.sendStatus(403)
    }
})
router.delete("/deleteTemplate/:messageId", async (req, res) => {
    const messageId = req.params.messageId as string
    await messageTemplateService.deleteMessageTemplate(messageId).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })
})
export default router
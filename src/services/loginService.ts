import axios from 'axios'


import * as memberService from './memberService';


import * as sheetService from './sheetService'

export const appendCustomer = async (result) => {
    let auth = await sheetService.authorize()
    let range = encodeURI('users!A2:E')
    return sheetService.appendSheet(auth, "19k-1kkOUORnJzIGBHJbpXqPaxrs3zTgZeX_LA3ZOMp4", range, result)
}

export const tempLogin = async function (personalId, password, lineId) {
    return new Promise<any>(async (resolve, reject) => {
     
        memberService.getMemberByMobilePhone(password).then(result => {
            if (!result.empty) {
                let data = result.docs[0].data()
                console.log(data)
                resolve(data)
            } else {
                reject("手機輸入錯誤!")
            }
        })
        
    })
}
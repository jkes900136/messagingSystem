import * as Line from '@line/bot-sdk';
import { Channel } from '@google-cloud/storage';

export type Member = {
    id: string
    name: string
    title?: string
    division?: string
    department?: string
    email: string
    mobilePhone: string
    businessPhone?: string
    lineId: string
    wechatId: string
    role?: "manager" | "staff" | "student" | "customer"
    sid?: string //學號、員工編號
    path?: string
    index?: number
    student?: string
    data?: any,
    lineGroup?: { groupId: "", name: "" }[]
    unReadMessages: number // type == Member || type == Line || type == WeChat 才有此欄位  
    session?: string
    groupId?: string
}
export type User = {
    id: string
    name: string
    email: string
    role: "admin" | "manager" | "staff"
}
export type MemberOrganization = ({
    type: "department" | "Work" | "Task" | "Item" | "Flow" | "Line" | "WeChat" | "Email" | "SMS"
    childrenId?: any[]  //組織下的所有人
} | {
    type: "member"
    memberId?: string               //對應 Member Collection 的id    
    channelId?: string // type == Line || type == WeChat 才有此欄位
}) & {
    id: string
    index?: number                 //排序
    parentId: string
    name: string
    member?: Member
}


export type Menu = {
    id: string
    parentId: string
    name: string
    index: number
    role?: "manager" | "staff" | "student" | "customer"
    ownerId?: string
}
export type MenuCsv = {
    id: string
    business: string
    event: string
    work: string
    index: number
    role?: string
    ownerId?: string
}
export type Friend = {
    id: string
}
/**
 * 2018/10/14 
 */

export type Work = {
    id: string
    name: string
    index: number
    tasks?: Task[]
}

export type Task = {
    id: string
    name: string
    index: number
    items?: Item[]
}

export type Item = {
    id: string
    name: string
    index: number
    flows?: Flow[]
    data?: ItemData
}
export type ItemData = {
    period: string,
    location: string,
    address: string,
    time?: string,
    invitationUrl?: string,
    nursingUrl?: string,
    volunteerUrl?: string
}
export type MemberData = {
    memberName?: string,
    invitationUrl?: string,
    meetingDate?: string,
    meetingTime?: string,
    meetingLocation?: string,
    preEventMeeting?: string
}
export type Flow = {
    id: string
    name: string
    index: number
    messageId: string
}
export type WorkUpload = {
    index: number
    role?: string
    work: string
    task?: string

    activity?: string
    date?: string
    time?: string
    address?: string
    location?: string
    invitationUrl?: string
    nursingUrl?: string
    volunteerUrl?: string
}
//////////////////////////////
export type Channel = {
    line: boolean
    wechat: boolean
    sms: boolean
    email: boolean
}
export type Catalog = {
    id: string
    name: string
    index: number
    messageId: string[]
    type: "dynamic" | "static"
    userId: string
}
export type MessageTemplate = {
    id: string
    title: string
    content: string
    urls?: { name: string, url: string }[]
    thumb: string
    type: string

    channel?: "Line" | "WeChat" | "SMS" | "Email"
}

export type MessageRecord = {
    id: string
    workId: string
    taskId: string
    itemId: string
    flowId: string
    sender: Member
    timeStamp: number
    sendCount: number
    successCount: number
    readCount: number
    title: string
    type: MessageTemplate["type"],
    channel: string
}
export type RecordDetail = {
    id: string
    receiver: Member
    channel: MessageTemplate['channel']
    message: string
    urls?: MessageTemplate["urls"]
    thumb?: string
    isSucceed: boolean
    receiveTime: number

    read: boolean
}
export type ChatMessage = {
    id: string
   
}
export type GARecord = {
    action: string
    label: {
        filename: string
        trackId: string
    }
    count: number
    duration: number
}
export type File = {
    id: string
    mimeType: string
    name: string
    sid: number
    fullName: string
    parents: string
    parentsName: Parents[]
    docId: string
    modifiedDate: number
    createdTime: number
    modifiedTime: number
}
export type Parents = {
    id?: string
    name?: string
    fullName?: string
}


export type Message = {
    type: string
    textMessage?: Line.TextMessage
    imageMapMessage?: Line.ImageMapMessage
    buttonsMessage?: Line.TemplateButtons
    confirmMessage?: Line.TemplateConfirm
    carouselMessage?: Line.TemplateCarousel
    imageCarouselMessage?: Line.TemplateImageCarousel
    imageMessage?: Line.ImageMessage
    videoMessage?: Line.VideoMessage
    audioMessage?: Line.AudioMessage
    locationMessage?: Line.LocationMessage
    stickerMessage?: Line.StickerMessage
}

/**
 * DBsync
 */
export type jsonMember = {
    memberId: string,
    organizationId: string,
    personalId: string,
    name: string,
    title: string,
    division: string,
    department: string,
    mobilePhone: string,
    email: string,
    lineId?: string,
    wechatId?: string,
    meetingDate?: string,
    meetingTime?: string,
    meetingLocation?: string,
    preEventMeeting?: string,
    unitIndex?: number,
    referrer?: string
}

//MQ版系統整合
export type ScheduleEvent = PubSubEvent
export type PubSubEvent = {
    id: string
    timeStamp: number
}

export type Event = {
    id: string
    // workId: string
    // taskId: string
    // itemId: string
    // flowId: string
    // messageId: string
    timeStamp: number
    content: string
    // files: File[]
    urls: MessageTemplate["urls"]
    thumb: string
    type?: MessageTemplate["type"]
    receivers: Member[]
    sender: User
    channel: string
}
export type EventResult = {
    id: string
    messageId: string | string[]
    content: string
    urls?: MessageTemplate["urls"]
    thumb?: string
    files?: File[]
    channel: string
    sender: User
    // receivers: {
    //     id: string
    //     data: any[]
    // }[]
    // receivers: Member[]
    timeStamp: number
    type?: MessageTemplate["type"]
}
export type ReviewMessage = {
    id: string
    /**
     * 0: 未處理
     * 1: 通過 / 未發送
     * 2: 通過 / 已發送
     * 3: 未通過
     */
    state: 0 | 1 | 2 | 3
    content: string
    channel: MessageTemplate['channel']
    sender: User
    // receivers: { id: string, data: any[] }[]
    expectTime: number
    urls: MessageTemplate['urls']
    type: "immediate" | "delay"
    auditor: User
    receiverCount: number
}

export type Issue = {
    id: string
    name: string
    ownerId: string  //建立這議題的人
    childrenId: [{ id: string, name: string }] //此議題所有參與者
}

export type IssueOrganization = ({
    type: "structure" | "system"

} | {
    type: "issue"
    issueId: string               //對應 Issue Collection 的id
    ownerId: string               //這份議題是屬於哪個人的
}) & {
    id: string
    parentId: string
    name: string
}

export class Group {
    id: string
    name: string
    ownerId: string
    // childrenId?: [{ id: string, name: string }]
    memberId: string[]
    // lineId?: string
}
export class BatchGroup {
    id: string
    name: string
    ownerId: string
    members: { id: string, content: string }[]
}
export type GroupOrganization = ({
    type: "structure" | "system"

} | {
    type: "group"
    groupId: string
    ownerId: string
}) & {
    id: string
    parentId: string
    name: string
}
export type Receiver = {
    id: string
    data: any[]
    index: number
}
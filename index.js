const axios = require('axios');
const discord = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, getVoiceConnection, createAudioResource } = require('@discordjs/voice');
const { Token, discordId, typeEmail, typePw } = require("./config.json")

const client = new discord.Client({ intents: 32767 });

process.on('uncaughtException', function (err) {
	console.log('uncaughtException 발생 : ' + err);
});

const words = {'?': '. 물음표', '!': '. 느낌표', '~': '. 물결표', '(': '. 괄호열고', ')': '. 괄호닫고', '{': '중괄호열고', '}': '중괄호닫고', '[': '대괄호열고', ']': '대괄호닫고'}
let actor = '6047863af12456064b35354e';
let style = '0';

let filter = true;

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on("messageCreate", async (message) => {
    if(message.author.id != discordId) {return}
    
    if (message.content == '?connect') {
        let = voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {return message.reply('음성 채널에 접속해주세요')}
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: message.guild.voiceAdapterCreator,
        });
        message.reply("음성 채널 입장 완료")
    } else if(message.content == '?dc') {
        const connection = getVoiceConnection(message.guild.id);
        if(!connection) {return message.reply("봇이 접속된 음성 채널이 없습니다")}
        
        connection.destroy()
        message.reply("음성 채널 퇴장 완료")
    } else if(message.content.startsWith('?set ')) {
        let args = message.content.split(' ');
        
        if(args[1] == 'filter') {
            if(args[2] == 'true') {
                filter = true;
                return message.reply('Set Filter: '+ args[2]);
            } else if (args[2] == 'false') {
                filter = false;
                return message.reply('Set Filter: '+ args[2]);
            } else {
                return message.reply('Invalid Value');
            }
        }
        
        actor = args[1];
        style = args[2];
        message.reply(`SET\nActor_ID: ${actor}\nStyle: ${style}`);
    } else if(message.content == '?form') {
        message.reply(`Actor_ID: ${actor}\nStyle: ${style}`);
    } else if(message.content == '?default') {
        actor = '6047863af12456064b35354e';
        style = '0'
        filter = true;
        message.reply('Default Set.')
    } else {
        const connection = getVoiceConnection(message.guild.id);
        if(!connection) {return}

        let msg = message.content;

        if(filter) {
            for(var word in words) {
                msg = replaceAll(msg, word, words[word])
            }
        }

        Tc(actor, style, msg).then((audio) => {
            console.log(audio)

            let resource = createAudioResource(audio, {
                inlineVolume: true
            })

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player)
            console.log(msg + ' | Play completed')
        })
    }
})

const Tc = async (actorId, style, text) => {
    var res = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBJN3ZYdzTmjyQJ-9TdpikbsZDT9JUAYFk', {
        "returnSecureToken": true,
        "email": typeEmail,
        "password": typePw
    });
    var res = await axios.post('https://typecast.ai/api/auth-fb/custom-token', {
        "token": res.data.idToken
    });
    var res = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBJN3ZYdzTmjyQJ-9TdpikbsZDT9JUAYFk', {
        "token": res.data.result.access_token,
        "returnSecureToken": true
    });
    let idToken = res.data.idToken;
    console.log('Get IdToken')

    var res = await axios.post('https://typecast.ai/api/speak/batch/post', [
        {
            "actor_id": actorId,
            "text": text,
            "lang": "auto",
            "naturalness": 0.8,
            "speed_x": 1,
            "tempo": 1,
            "pitch": 0,
            "mode": "one-vocoder",
            "style_label": style,
            "style_label_version": "v2"
        }
    ],
    {
        headers: {
            Authorization: 'Bearer ' + idToken
        }
    });
    let speak_url = res.data.result.speak_urls[0]
    console.log("Get speak_url")

    let audioUrl = "";
    while(true) {
        var res = await axios.post('https://typecast.ai/api/speak/batch/get', [
            speak_url
        ],
        {
            headers: {
                Authorization: 'Bearer ' + idToken
            }
        });
        var status = res.data.result[0].status

        if(status == 'progress') {
            console.log('progress. . .')
            continue;
        } else if(status == 'done') {
            audioUrl = res.data.result[0].audio.url
            console.log('Done!')
            break;
        } else {
            console.log(status+'?')
            return
        }
    }

    var res = await axios.get(audioUrl+'/no-redirect', {
        headers: {
            Authorization: 'Bearer ' + idToken
        }
    });
    let audio = res.data.result
    console.log('Get Audio')

    return audio;
};

function replaceAll(str, searchStr, replaceStr) {
    return str.split(searchStr).join(replaceStr);
}

client.login(Token);
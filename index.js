const Discord = require('discord.js');
const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const client = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_VOICE_STATES] });
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const PREFIX = '.';
var songQueue = [];
var connection = null;
var audioPlayer = null;

client.on('ready', () => {
console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async msg => {
    if (msg.content.slice(0,PREFIX.length) === PREFIX) {

        const voiceChannel = msg.member.voice.channel;
        if (!voiceChannel) return msg.channel.send("you have to be in a voice channel to play music");
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) return msg.channel.send("Dont have permissions bozo");

        let args = msg.content.slice(PREFIX.length, msg.content.length).split(' ');
        switch (args[0]) {
            case 'play':
                if (args.length === 1) return msg.channel.send("play what nob head?");

                const videoFinder = async (query) => {
                    const videoFind = await ytSearch(query);
                    if (!videoFind.videos[0]) return null;
                    return videoFind.videos[0];
                }

                let song = {};
                const video = await videoFinder(args.slice(1, args.length).join(' '));
                if (video) {
                    song = {title: video.title, url: video.url};
                } else {
                    return msg.channel.send("Couldn't find it");
                }

                if (songQueue.length == 0) {
                    try {
                        connection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: voiceChannel.guild.id,
                            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                            selfDeaf: false,
                            selfMute: false
                        });
                        audioPlayer = createAudioPlayer();
                        connection.subscribe(audioPlayer);
                        songQueue.push(song);
                        await playSong(audioPlayer, voiceChannel, msg.channel, connection, song)
                        
                    } catch (err) {
                        console.log(err.message);
                        msg.channel.send("Unexpected error while connecting :(");
                        return
                    }
                } else {
                    songQueue.push(song);
                    msg.channel.send(`${song.title} added to the  queue`);
                }
                break;
              
            case 'skip': 
                return skipSong(audioPlayer, voiceChannel, msg.channel, connection);
            case 'clear': 
                songQueue = [];
                if (audioPlayer != null){
                    audioPlayer.stop()
                }
                return msg.channel.send("Queue cleared");
              
            case 'stop': 
                songQueue = [];
                msg.channel.send(":(");
                if (audioPlayer != null){
                    audioPlayer.stop()
                }
                return
            
        };

    }
});

const playSong = async (audioPlayer, voiceChannel, textChannel, connection, song) =>{
    
    if (!song) return audioPlayer.stop()

    const stream = ytdl(song.url, { filter: 'audioonly' });
    audioPlayer.play(createAudioResource(stream, {seek: 0, volume: 1}))
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
        songQueue.shift();
        playSong(audioPlayer, voiceChannel, textChannel, connection, songQueue[0]);
    });
    await textChannel.send(`~~~~~~ Now playing: ${song.title} ~~~~~~`);

}

const skipSong = async (audioPlayer, voiceChannel, textChannel, connection) =>{
    if (songQueue.length == 0){
        return 
    } 
    if (connection != null){
        songQueue.shift();
        return playSong(audioPlayer, voiceChannel, textChannel, connection, songQueue[0]);
    }


}


client.login('secret bot key :)');
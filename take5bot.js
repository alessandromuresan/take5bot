'use strict';

var Botkit = require('botkit');
var slack = require('slack');

class Take5Bot {

    constructor(config) {

        if (!config.token) {
            throw new Error('Please provide a token');
        }

        if (!config.timeoutValue) {
            config.timeoutValue = 15;
        }

        if (!config.name) {
            config.name = 'take5bot';
        }

        this.token = config.token;
        this.name = config.name;

        this.messages = config.messages || ['Take 5'];
        this.enableMessages = config.enableMessages || ['start'];
        this.disableMessages = config.disableMessages || ['stop'];

        this.enableMessages = this.enableMessages.map(m => m.toLowerCase());
        this.disableMessages = this.disableMessages.map(m => m.toLowerCase());

        this.enabledUsers = [];
        this.userData = {};

        this.enabled = {};
        this.lastUpdated = {};

        this.timeoutValue = config.timeoutValue * 60 * 1000;

        this.controller = Botkit.slackbot({
            debug: 1, // from 1 to 7
        });

        this.on('tick', this.onTick.bind(this));
        this.on('direct_message', this.onDirectMessage.bind(this));
    }

    start () {

        this.controller
            .spawn({
                token: this.token
            })
            .startRTM(this.onRTMStarted.bind(this));
    }

    onRTMStarted() {

        console.log('RTM started');
    }

    on (messageType, handler) {

        this.controller.on(messageType, handler);
    }

    onDirectMessage (bot, message) {

        var userId = message.user;

        this.userData[userId] = {
            bot: bot,
            message: message,
            id: userId,
            user: null
        };

        slack.users.info({ token: this.token, user: userId }, (err, data) => {

            if (err) {
                console.error(err);
                return;
            }

            this.userData[userId].user = data.user;
        });

        if (this.isDisableMessage(message.text)) {

            if (this.enabled[userId]) {

                this.enabled[userId] = false;

                this.enabledUsers.splice(this.enabledUsers.indexOf(userId), 1);

                bot.reply(message, 'Disabled');

            } else {

                if (typeof this.enabled[userId] !== 'undefined') {
                    bot.reply(message, 'I\'m already disabled');
                } else {
                    bot.reply(message, 'You haven\'t enabled me yet');
                }
            }
        }

        if (this.isEnableMessage(message.text)) {

            if (!this.enabled[userId]) {

                this.enabled[userId] = true;

                this.enabledUsers.push(userId);

                this.updateTake5(userId);

                bot.reply(message, 'Enabled');

            } else {

                bot.reply(message, 'I\'m already enabled');
            }
        }
    }

    onTick() {

        this.enabledUsers.forEach(userId => {
            
            var userData = this.userData[userId];

            if (this.shouldTake5(userId)) {
                this.sendTake5Message(userData);
                this.updateTake5(userId);
            }
        });
    }

    sendTake5Message(userData) {

        var userId = userData.id;
        var bot = userData.bot;
        var message = userData.message;
        var user = userData.user;

        if (this.enabled[userId]) {

            bot.reply(message, this.getTake5Message(user));
        }
    }

    getTake5Message(user) {

        var message = this.messages[Math.floor(Math.random() * this.messages.length)];

        return message;
    }

    shouldTake5(userId) {

        if (typeof this.lastUpdated[userId] === 'undefined') {
            return;
        }

        var now = (new Date()).getTime();
        var lastUpdated = this.lastUpdated[userId].getTime();

        return (now - lastUpdated) >= this.timeoutValue;
    }

    updateTake5(userId) {
        this.lastUpdated[userId] = new Date();
    }

    isEnableMessage(text) {
        return this.enableMessages.indexOf(text.toLowerCase()) !== -1;
    }

    isDisableMessage(text) {
        return this.disableMessages.indexOf(text.toLowerCase()) !== -1;
    }
}

module.exports = Take5Bot;

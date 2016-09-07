// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");
Scores = new Mongo.Collection("snakeladder");

if (Meteor.isClient) {
  Template.leaderboard.helpers({
    players: function () {
      return Players.find({}, { sort: {index: 1 } });
    },
    selectedName: function () {
      var player = Players.findOne({index : { $eq : Session.get("selectedPlayer")}});
      return player && player.name;
    },
    endGame: function () {
      var gameEnd = Session.get("endGame");
      return gameEnd
    },
    startGame: function () {
      var gameStart = Session.get("startGame");
      return gameStart
    },
    winner: function () {
      var win = Session.get("winner");
      return win
    },
    message: function () {
      return Session.get("message");
    },
  });

  Template.leaderboard.events({
    'click .inc': function () {
      var i = Math.floor((Math.random() * 6) + 1)
      var ind = Session.get("selectedPlayer")
      var pl = Players.findOne({index: {$eq: ind}})
      var sc = pl['score']
      var id = pl['_id']

      // No more at startGame state
      Session.set("startGame", false)

      // Add Score to selectedPlayer
      Players.update({_id:id}, {$set: {step: i}})
      Players.update({_id:id}, {$inc: {score: i}})

      previous_sc = sc
      sc = Players.findOne({index: {$eq: ind}})['score']
      step = Players.findOne({index: {$eq: ind}})['step']

      // Adding in condition if score is more than 100, move backward, message is set differently
      if (sc > 100) {
        sc = 200 - sc
        message = Players.findOne({index: {$eq: ind}})['name'] + " from " + previous_sc + " move " + step.toString() + " steps foward to 100 then back to position "  + sc.toString()
        Players.update({_id:id}, {$set: {score: sc}})
      }
      else {
        message = Players.findOne({index: {$eq: ind}})['name'] + " from " + previous_sc + " move " + step.toString() + " steps foward to position "  + sc.toString()
      }

      Session.set("message",message);

      // Snake and Ladder
      no_pair = Scores.find().count()
      for (k=0; k < no_pair; k++) {
        var input = Scores.findOne({pair: {$eq: k}})['input']
        var output = Scores.findOne({pair: {$eq: k}})['output']
        if ((Players.findOne({index : {$eq : ind}})['score']) == input) {
          Players.update({_id:id}, {$set: {score: output}})
        }
      }

      var no_players = Players.find().count()

      sc_s_l = Players.findOne({index: {$eq: ind}})['score']
      s_or_l = sc_s_l - sc

      // Customize message if landing on Snake or Ladder
      if (s_or_l > 0) {
        message_s_l = message + ", met a ladder, go to position " + sc_s_l.toString()
      } 
      else if (s_or_l < 0) {
        message_s_l = message + ", met a snake, go to position " + sc_s_l.toString()
      }
      else {
        message_s_l = message
      }
      Session.set("message",message_s_l);

      // If hit same score with other user then go back to 0, add more information to message displayed
      var list = [];
      for (j = 1; j < no_players; j++ ) {
        otherIndex = (ind + j) % no_players
        otherScore = Players.findOne({index: { $eq: otherIndex}})['score']
        if (otherScore != 0) {
          list[j-1] = otherScore
        }
      }

      if (list.includes(sc_s_l)) {
        Players.update({_id:id}, {$set: {score: 0}})
        message_m = message_s_l + ", met other player at position " + sc.toString() + ", go back to starting position"
        Session.set("message", message_m);
      };

      // Move to next player if not win else Display Game End and Current Player Win the Game
      if (sc < 100) {
        Session.set("selectedPlayer", (ind + 1) % no_players);
      } else {
        Session.set("endGame", true);
        Session.set("winner",  Players.findOne({index : { $eq : Session.get("selectedPlayer")}})['name']);
      }

    },
    // Add reset function to reset all score to 0 at anytime of the game
    'click .reset': function () {
      var no_players = Players.find().count()
      for (i = 0; i < no_players; i++) {
        var id = Players.findOne({index: {$eq: i}})['_id']
        Players.update({_id:id}, {$set: {score: 0}});
        Players.update({_id:id}, {$set: {step: 0}});
        Session.set("endGame", false);
        Session.set("selectedPlayer", false);
        Session.set("winner",  false);
        Session.set("startGame", false)
      }
    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("selectedPlayer", this.index) ? "selected" : '';
    }
  });

  Template.player.events({
    'click': function () {
      var playerIndex = this.index
      Session.set("selectedPlayer", playerIndex);
      Session.set("startGame", true);
      Session.set("message","Start Game");
    }
  });
}

// On server startup, create some players and snake and ladder map if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {

    var items = [[3,51],[6,27],[20,70],[25,5],[34,1],[36,55],[47,19],[63,95],[65,52],[68,98],[87,57],[91,61],[99,69]]

    if (Scores.find().count() === 0) {
      var pair = 0
      for (i = 0; i < items.length; i++) {
        Scores.insert({
          pair: pair++,
          input:items[i][0],
          output:items[i][1]});
      }
    };
    console.log(Scores.find({input:10}))

    if (Players.find().count() === 0) {
      var names = ["Ada Lovelace","Carl Friedrich Gauss", "Grace Hopper", "Marie Curie"];
      var index = 0;
      _.each(names, function (name) {
        Players.insert({
          name: name,
          score: 0,
          index: index++,
          step: 0

        });
      });
    }
    console.log(Players.find())
  });
}

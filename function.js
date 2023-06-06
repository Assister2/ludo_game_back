export async function startGame(data) {
    try {
      let startChallenge = await challengesController.getChallengeById(data.payload.challengeId);
      var otherplayerId = startChallenge.player._id;
      let otherPlayer = await userController.existingUserById({ id: otherplayerId });
      let user2 = await userController.existingUserById({ id: data.payload.userId });
      console.log("creator", user2);
      console.log("player", otherPlayer);
  
      if (startChallenge.state == "playing" && user2.playing && otherPlayer.playing) {
        response = {
          ...response,
          status: 400,
          error: "Challenge or user in playing state",
          data: null,
        };
        return socket.send(JSON.stringify(response));
      }
  
      if (startChallenge.state != "playing" && !user2.playing && !otherPlayer.playing) {
        if (startChallenge) {
          await challengesController.deleteOpenChallengesCreator(startChallenge.creator._id);
          await challengesController.deleteOpenChallengesCreator(startChallenge.player._id);
        }
  
        let startGameChallenge = await challengesController.updateChallengeById({
          _id: data.payload.challengeId,
          state: "playing",
        });
  
        if (startGameChallenge) {
          await challengesController.deleteRequestedChallenges(startChallenge.creator._id);
          await challengesController.cancelRequestedChallenges(startChallenge.creator._id);
          await challengesController.deleteRequestedChallenges(startChallenge.player._id);
  
          try {
            await accountController.decreasePlayersAccount(startChallenge);
          } catch (error) {
            response = {
              ...response,
              status: 500,
              error: "Error decreasing players account",
              data: null,
            };
            return socket.send(JSON.stringify(response));
          }
        }
  
        if (!startGameChallenge) {
          response = {
            ...response,
            status: 400,
            error: "Challenge not found",
            data: null,
          };
          return socket.send(JSON.stringify(response));
        }
  
        await userController.findUserById(data.payload.userId);
        await userController.updateUserByUserId({
          _id: data.payload.userId,
          playing: true,
          hasActiveChallenge: false,
        });
  
        await userController.updateUserByUserId({
          _id: otherplayerId,
          playing: true,
          hasActiveChallenge: false,
        });
  
        response = {
          ...response,
          status: 200,
          error: null,
          data: null,
          challengeRedirect: true,
          challengeId: startGameChallenge._id,
        };
  
        socket.send(JSON.stringify(response));
      }
    } catch (error) {
      response = {
        ...response,
        status: 500,
        error: "Error starting the game",
        data: null,
      };
  
      socket.send(JSON.stringify(response));
    }
  }
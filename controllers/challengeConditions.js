async function otherPlyerLost(challenge, userWallet, winner, looser,challengeObj, session) {
  challengeObj.state = "resolved";
  let deduction = challenge.amount * 0.03;
  amount = amount * 2 - (amount * 3) / 100;

  const winnWall = await accountController.updateAccountByUserId(
    {
      ...userWallet._doc,
      wallet: userWallet.wallet + amount,
      winningCash: userWallet.winningCash + amount,
      totalWin: userWallet.totalWin + challenge.amount - deduction,
    },
    session
  );
  let looserWallet23 = await accountController.getAccountByUserId(
    challenge[looser]._id
  );
  const historyObj = {
    userId: challenge[looser]._id,
    historyText: `Lost Against ${challenge[winner].username}`,
    roomCode: challenge.roomCode,
    closingBalance: looserWallet23.wallet,
    amount: Number(challenge.amount),
    type: "lost",
  };
  await generateHistory(historyObj, session);

  const winnerObj = {
    userId: challenge[winner]._id,
    historyText: `Won Against ${challenge[looser].username}`,
    roomCode: challenge.roomCode,
    closingBalance: winnWall.wallet,
    amount: Number(amount),
    type: "won",
  };
  await generateHistory(winnerObj, session);

  let referUser = await userController.existingUserById({
    id: challenge[winner]._id,
  });

  if (referUser.referer) {
    let referalAccount = await userController.existingUserByReferelId(
      referUser.referer
    );

    const userWall = await accountController.increaseRefererAccount(
      {
        userId: referalAccount._id,
        amount: challenge.amount,
      },
      session
    );

    const historyObj = {
      userId: userWall.userId,
      historyText: `referal from ${challenge[winner].username}`,
      roomCode: challenge.roomCode,
      closingBalance: userWall.wallet,
      amount: Number(challenge.amount * 0.02),
      type: "referal",
    };
    await generateHistory(historyObj, session);
  }
}
module.exports = {
  otherPlyerLost,
};

exports.user = async (username, password) => {
  const user = await User.findOne();
  res.json(user);
};

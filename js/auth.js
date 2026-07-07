// Owner Authentication Layer (CORS-friendly for file:// protocol)

function checkSession() {
  return sessionStorage.getItem('ownerSessionActive') === 'true';
}

async function login(username, password) {
  const hash = await hashPassword(password);
  const user = await db.get('users', username);

  if (user && user.passwordHash === hash) {
    sessionStorage.setItem('ownerSessionActive', 'true');
    sessionStorage.setItem('currentOwnerUser', username);
    return { success: true };
  }
  return { success: false, message: 'Invalid username or password' };
}

function logout() {
  sessionStorage.removeItem('ownerSessionActive');
  sessionStorage.removeItem('currentOwnerUser');
}

async function updateOwnerProfile(newUsername, newPassword, securityQuestion, securityAnswer) {
  const currentUsername = sessionStorage.getItem('currentOwnerUser') || 'owner';
  const existingUser = await db.get('users', currentUsername);
  
  if (!existingUser) {
    return { success: false, message: 'Current user session invalid. Please log in again.' };
  }

  // Determine password hash
  let passwordHash = existingUser.passwordHash;
  if (newPassword && newPassword.trim() !== '') {
    passwordHash = await hashPassword(newPassword);
  }

  // Determine security answer hash
  let answerHash = existingUser.securityAnswerHash || existingUser.securityAnswer; // fallback to plain if old
  if (securityAnswer && securityAnswer.trim() !== '') {
    answerHash = await hashPassword(securityAnswer.toLowerCase().trim());
  }

  const updatedUser = {
    username: newUsername || existingUser.username,
    passwordHash: passwordHash,
    securityQuestion: securityQuestion || existingUser.securityQuestion,
    securityAnswerHash: answerHash,
    createdAt: existingUser.createdAt || new Date().toISOString()
  };

  if (newUsername && newUsername !== currentUsername) {
    // Delete old user entry, write new
    await db.delete('users', currentUsername);
    await db.put('users', updatedUser);
    sessionStorage.setItem('currentOwnerUser', newUsername);
  } else {
    await db.put('users', updatedUser);
  }

  return { success: true };
}

// Reset password via security question
async function resetPassword(username, answer, newPassword) {
  const user = await db.get('users', username);
  if (!user) {
    return { success: false, message: 'Username does not exist' };
  }

  // Hash answer for comparison (check either hashed or legacy plain text)
  const hashedInputAnswer = await hashPassword(answer.toLowerCase().trim());
  const storedAnswerHash = user.securityAnswerHash || '';
  const storedAnswerPlain = user.securityAnswer || ''; // legacy support

  let isAnswerCorrect = false;
  if (storedAnswerHash) {
    isAnswerCorrect = (storedAnswerHash === hashedInputAnswer);
  } else {
    isAnswerCorrect = (storedAnswerPlain.toLowerCase().trim() === answer.toLowerCase().trim());
  }

  if (!isAnswerCorrect) {
    return { success: false, message: 'Incorrect answer to the security question.' };
  }

  const newHash = await hashPassword(newPassword);
  user.passwordHash = newHash;
  // Upgrade security answer structure to hashed if it was legacy plain text
  if (!user.securityAnswerHash && user.securityAnswer) {
    user.securityAnswerHash = await hashPassword(user.securityAnswer.toLowerCase().trim());
    delete user.securityAnswer;
  }

  await db.put('users', user);
  return { success: true };
}

// Get the security question of a user
async function getSecurityQuestion(username) {
  const user = await db.get('users', username);
  if (user) {
    return { success: true, question: user.securityQuestion };
  }
  return { success: false, message: 'Username not found' };
}

// Expose globally
window.auth = {
  checkSession,
  login,
  logout,
  updateOwnerProfile,
  resetPassword,
  getSecurityQuestion
};

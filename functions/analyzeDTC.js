const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.analyzeDTC = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');
  
  const { dtcCode, vehicleInfo, freezeFrame } = data;
  const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  
  // Call Gemini API and return structured analysis
  const analysis = await model.generateContent(/* prompt */);
  
  // Log to Firestore for analytics
  await admin.firestore().collection('diagnostics').add({
    userId: context.auth.uid,
    dtcCode,
    analysis: analysis.response.text(),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { analysis: analysis.response.text() };
});
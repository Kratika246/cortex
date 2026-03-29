import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_API_TOKEN?.replace(/^["']|["']$/g, '').trim();
const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
const projectKey = process.env.JIRA_PROJECT_KEY;

const auth = Buffer.from(`${email}:${token}`).toString('base64');

async function check() {
  console.log('Testing JQL with:', { email, projectKey, baseUrl });
  try {
    const res = await axios.get(`${baseUrl}/rest/api/3/search/jql`, {
      params: {
        jql: `project = "${projectKey}"`,
        maxResults: 50
      },
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    console.log('Total issues:', res.data.total);
    console.log('Issues keys:', res.data.issues.map(i => i.key));
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

check();

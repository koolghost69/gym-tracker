export async function onRequestPost(context) {
    const { env, request } = context;
  
    try {
      const { users } = await request.json();
      await env.GYM_DATA.put('gym-users', JSON.stringify(users));
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
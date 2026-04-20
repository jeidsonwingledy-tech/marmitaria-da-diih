/**
 * Script para configurar o banco de dados Supabase.
 * Usa a API REST do PostgREST (não precisa de service_role).
 * 
 * As tabelas precisam ser criadas via SQL Editor do Supabase.
 * Este script testa a conexão e insere os dados iniciais.
 */

const SUPABASE_URL = 'https://jullhukqlbiaursxrmcd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bGxodWtxbGJpYXVyc3hybWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzY1ODgsImV4cCI6MjA5MjExMjU4OH0.PzYdwxKsnzEf-xd-Sn7In5tWeHpq8j5C0uGarChIRHQ';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function testConnection() {
  console.log('🔍 Testando conexão com o Supabase...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=id&limit=1`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      console.log('✅ Tabela "settings" existe! Dados:', data);
      return true;
    } else if (res.status === 404) {
      const err = await res.json();
      console.log('❌ Tabelas ainda não existem:', err.message);
      return false;
    } else {
      console.log('⚠️ Status inesperado:', res.status, await res.text());
      return false;
    }
  } catch (e) {
    console.error('❌ Erro de conexão:', e.message);
    return false;
  }
}

async function insertInitialData() {
  console.log('\n📦 Inserindo dados iniciais...');
  
  // 1. Settings
  console.log('  → Inserindo settings...');
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({
      id: 'info',
      name: 'Marmitaria da Diih',
      phone: '(19) 95330-7669',
      whatsappNumber: '5519953307669',
      address: 'Rua Exemplo, 123 - Centro',
      logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      banner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
      instagramUrl: 'https://instagram.com',
      facebookUrl: 'https://facebook.com',
      adminPassword: 'admin123',
      pixKey: '',
      pixKeyType: 'email',
      pixName: 'Marmitaria da Diih',
      pixCity: 'Amparo-SP',
      businessHours: 'Segunda a Sábado: 10:30 às 14:30',
      delivery: { freeShippingThreshold: 150, standardFee: 5.00, neighborhoods: [{ name: 'Centro', price: 5.00 }, { name: 'Jardim das Flores', price: 7.00 }, { name: 'Vila Nova', price: 8.00 }] },
      style: { primaryColor: '#EA1D2C', priceColor: '#EA1D2C', backgroundColor: '#FFFFFF', cardColor: '#FFFFFF', textColor: '#404040' },
      notice: { active: true, text: 'Estamos atendendo normalmente!' }
    })
  });
  if (settingsRes.ok) console.log('  ✅ Settings inserido!');
  else console.log('  ❌ Settings erro:', await settingsRes.text());

  // 2. Categorias
  console.log('  → Inserindo categorias...');
  const categoriasRes = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify([
      { id: 'pratododia', name: 'Prato do Dia', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&h=300&q=80', active: true },
      { id: 'marmitas', name: 'Marmitas', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&h=300&q=80', active: true },
      { id: 'fit', name: 'Linha Fit', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&h=300&q=80', active: true },
      { id: 'drinks', name: 'Bebidas', image: 'https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&w=300&h=300&q=80', active: true },
      { id: 'desserts', name: 'Sobremesas', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&h=300&q=80', active: true }
    ])
  });
  if (categoriasRes.ok) console.log('  ✅ Categorias inseridas!');
  else console.log('  ❌ Categorias erro:', await categoriasRes.text());

  // 3. Menu Items
  console.log('  → Inserindo produtos...');
  const menuRes = await fetch(`${SUPABASE_URL}/rest/v1/menuItems`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify([
      {
        id: '1', categoryId: 'marmitas', name: 'Bife Acebolado',
        description: 'Arroz branco soltinho, feijão carioca, bife de alcatra acebolado, fritas e farofa da casa.',
        price: 22.90,
        images: ['https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
        optionGroups: [{ id: 'size', title: 'Tamanho', required: true, min: 1, max: 1, options: [{ id: 'p', name: 'Pequena', price: 0, available: true }, { id: 'm', name: 'Média', price: 4.00, available: true }, { id: 'g', name: 'Grande', price: 7.00, available: true }] }],
        available: true
      },
      {
        id: '4', categoryId: 'fit', name: 'Frango Grelhado',
        description: 'Arroz integral, mix de legumes no vapor (brócolis, cenoura, vagem) e filé de frango grelhado.',
        price: 19.90,
        images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'],
        optionGroups: [{ id: 'size', title: 'Tamanho', required: true, min: 1, max: 1, options: [{ id: 'p', name: 'Pequena', price: 0, available: true }, { id: 'm', name: 'Média', price: 4.00, available: true }, { id: 'g', name: 'Grande', price: 7.00, available: true }] }],
        available: true
      }
    ])
  });
  if (menuRes.ok) console.log('  ✅ Produtos inseridos!');
  else console.log('  ❌ Produtos erro:', await menuRes.text());
}

async function main() {
  const tablesExist = await testConnection();
  
  if (!tablesExist) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  AS TABELAS AINDA NÃO EXISTEM NO SUPABASE!');
    console.log('='.repeat(60));
    console.log('\nVocê precisa criar as tabelas primeiro.');
    console.log('Abra o SQL Editor do Supabase e execute o SQL.');
    console.log('\nURL: https://supabase.com/dashboard/project/jullhukqlbiaursxrmcd/sql/new');
    console.log('\nDepois disso, rode este script novamente:');
    console.log('  node setup-db.mjs');
    return;
  }
  
  await insertInitialData();
  console.log('\n🎉 Setup completo! A app está pronta para uso.');
}

main();

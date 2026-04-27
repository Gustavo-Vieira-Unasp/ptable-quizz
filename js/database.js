const SUPABASE_URL = 'PLACEHOLDER_SUPABASE_URL';
const SUPABASE_KEY = 'PLACEHOLDER_SUPABASE_KEY';

function getClient() {
    if (SUPABASE_URL.includes('PLACEHOLDER')) {
        throw new Error("Supabase URL não foi injetada corretamente pelo CI/CD.");
    }
    return supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function saveAttempt(listaSimbolos) {
    const supabaseClient = getClient();
    const stringElementos = listaSimbolos.join(',');
    const { error } = await supabaseClient
        .from('tries')
        .insert([{ elementos_ids: stringElementos }]);
    
    if (error) console.error("Erro ao salvar tentativa:", error);
}

export async function getGlobalRarity() {
    const supabaseClient = getClient();
    const { data, error } = await supabaseClient
        .from('tries')
        .select('elementos_ids');

    if (error) {
        console.error("Erro ao buscar dados:", error);
        return { raridadeMap: {}, totaltries: 0 };
    }

    const totaltries = data.length || 0;

    if (totaltries === 0) {
        return { raridadeMap: {}, totaltries: 0 };
    }

    const contagem = {};

    data.forEach(row => {
        const simbolos = row.elementos_ids.split(',');
        const unicosNaPartida = [...new Set(simbolos)];
        unicosNaPartida.forEach(s => {
            if (s) contagem[s] = (contagem[s] || 0) + 1;
        });
    });

    const raridadeMap = {};
    for (const simbolo in contagem) {
        raridadeMap[simbolo] = ((contagem[simbolo] / totaltries) * 100).toFixed(1);
    }

    return { raridadeMap, totaltries };
}
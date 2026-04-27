const SUPABASE_URL = 'PLACEHOLDER_SUPABASE_URL';
const SUPABASE_KEY = 'PLACEHOLDER_SUPABASE_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export async function saveAttempt(listaSimbolos) {
    const stringElementos = listaSimbolos.join(',');
    const { error } = await supabaseClient
        .from('tentativas')
        .insert([{ elementos_ids: stringElementos }]);
    
    if (error) console.error("Erro ao salvar tentativa:", error);
}

export async function getGlobalRarity() {
    const { data, error } = await supabaseClient
        .from('tentativas')
        .select('elementos_ids');

    if (error) {
        console.error("Erro ao buscar dados:", error);
        return {};
    }

    const totalTentativas = data.length;
    const contagem = {};

    data.forEach(row => {
        const simbolos = row.elementos_ids.split(',');
        simbolos.forEach(s => {
            if (s) contagem[s] = (contagem[s] || 0) + 1;
        });
    });

    const raridadeMap = {};
    for (const simbolo in contagem) {
        raridadeMap[simbolo] = ((contagem[simbolo] / totalTentativas) * 100).toFixed(1);
    }

    return { raridadeMap, totalTentativas };
}
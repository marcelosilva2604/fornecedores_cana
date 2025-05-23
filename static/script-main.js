document.addEventListener('DOMContentLoaded', function() {
    // Elementos principais
    const screeningForm = document.getElementById('screeningForm');
    const resultsDiv = document.getElementById('results');
    const examsResults = document.getElementById('examsResults');
    const errorDiv = document.getElementById('error');
    const printButton = document.getElementById('printButton');
    const printDateSpan = document.getElementById('printDate');
    
    // Elementos do formulário principal
    const babyNameInput = document.getElementById('babyName');
    const birthDateInput = document.getElementById('birthDate');
    const gestWeeksInput = document.getElementById('gestationalAgeWeeks');
    const gestDaysInput = document.getElementById('gestationalAgeDays');
    const birthWeightInput = document.getElementById('birthWeight');
    
    // Elementos para resultados do paciente
    const patientDataSection = document.getElementById('patientDataSection');
    const resNameSpan = document.getElementById('resName');
    const resBirthDateSpan = document.getElementById('resBirthDate');
    const resGestAgeSpan = document.getElementById('resGestAge');
    const resWeightSpan = document.getElementById('resWeight');
    
    // Modal de fatores de risco (se disponível)
    const riskFactorsModal = document.getElementById('riskFactorsModal') ? 
        new bootstrap.Modal(document.getElementById('riskFactorsModal')) : null;
    
    // Data de hoje
    const today = new Date().toISOString().split('T')[0];
    
    // Configuração inicial da data
    if (birthDateInput) {
        birthDateInput.max = today;
        birthDateInput.value = today;
    }
    
    // IMPLEMENTAÇÃO DAS FUNÇÕES DO BACKEND
    
    // Função para obter a próxima terça ou sexta-feira a partir de uma data
    function getNextTuesdayOrFriday(date) {
        const d = new Date(date);
        const weekday = d.getDay(); // 0=Dom, 1=Seg, 2=Ter, 5=Sex
        
        let daysToAdd;
        if (weekday < 2) { // Dom ou Seg
            daysToAdd = 2 - weekday; // Próxima terça
        } else if (weekday < 5) { // Ter, Qua ou Qui
            daysToAdd = 5 - weekday; // Próxima sexta
        } else { // Sex ou Sáb
            daysToAdd = 9 - weekday; // Próxima terça
        }
        
        d.setDate(d.getDate() + daysToAdd);
        return d;
    }
    
    // Função para calcular o primeiro USG
    function calculateFirstUsg(birthDate) {
        const birthDateObj = new Date(birthDate);
        // Data alvo para primeiro US (7 dias após nascimento)
        const targetDate = new Date(birthDateObj);
        targetDate.setDate(targetDate.getDate() + 7);
        
        // Encontrar a próxima terça ou sexta para o primeiro USG
        return getNextTuesdayOrFriday(targetDate);
    }
    
    // Função para formatar datas
    function formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('pt-BR');
    }
    
    // Adicionar dias a uma data
    function addDays(dateObj, days) {
        const date = new Date(dateObj);
        date.setDate(date.getDate() + days);
        return date;
    }
    
    // Calcular idade corrigida
    function calculateCorrectedAge(birthDate, gestWeeks, gestDays) {
        const totalGestDays = gestWeeks * 7 + gestDays;
        const correctionDays = 280 - totalGestDays; // 280 dias = 40 semanas
        
        // Se nasceu com 40 semanas ou mais, não há correção
        if (correctionDays <= 0) {
            return new Date(birthDate);
        }
        
        // Adicionar dias para corrigir a idade
        return addDays(new Date(birthDate), correctionDays);
    }
    
    // Normalizar peso
    function normalizeWeight(weightStr) {
        // Remove espaços e substitui vírgula por ponto
        weightStr = weightStr.trim().replace(',', '.');
        
        // Converte para número
        const weight = parseFloat(weightStr);
        
        // Se o peso for menor que 10, assumimos que está em kg e convertemos para g
        if (weight < 10) {
            return Math.round(weight * 1000);
        }
        
        return Math.round(weight);
    }
    
    // Calcular datas das triagens
    function calculateUtiDates(babyName, birthDate, gestationalAge, gestationalAgeFormatted, birthWeight, hasRiskFactors = false) {
        const birthDateObj = new Date(birthDate);
        const gestationalAgeNum = parseFloat(gestationalAge);
        const birthWeightNum = parseFloat(birthWeight);
        const results = {};
        
        // Extrair semanas inteiras para comparações
        const gestationalWeeks = Math.floor(gestationalAgeNum);
        
        // 1. HPIV - US Crânio Transfontanela - Apenas a data do primeiro USG
        let needsUsCranio = false;
        
        if (gestationalWeeks <= 30 || birthWeightNum < 1500 || hasRiskFactors) {
            needsUsCranio = true;
        }
        
        if (needsUsCranio) {
            const firstUsDate = calculateFirstUsg(birthDateObj);
            results['USG de Crânio'] = [["Primeiro USG", formatDate(firstUsDate) + " (ter/sex)"]];
        }
        
        // 2. Retinopatia da Prematuridade - Fundo de Olho
        if (birthWeightNum < 1500 || gestationalWeeks < 32) {
            // Encontrar uma data entre 4-6 semanas que seja terça ou sexta
            let targetDate = addDays(birthDateObj, 28); // 4 semanas
            let foDate = getNextTuesdayOrFriday(targetDate);
            
            // Se a data for depois de 6 semanas, usar 6 semanas - 3 dias
            if ((foDate - birthDateObj) / (1000 * 60 * 60 * 24) > 42) { // 6 semanas
                foDate = addDays(birthDateObj, 39); // 6 semanas - 3 dias
                foDate = getNextTuesdayOrFriday(foDate);
            }
            
            results['Retinopatia - Fundo de Olho'] = [["Fundo de Olho", formatDate(foDate) + " (ter/sex)"]];
        }
        
        // 3. Doença Metabólica Óssea
        if (birthWeightNum < 1500 || gestationalWeeks < 32) {
            const metabolic = [];
            
            // Data do primeiro exame (21 dias após nascimento)
            const firstExamDate = addDays(birthDateObj, 21);
            metabolic.push(["1º Exame Metabólico", formatDate(firstExamDate)]);
            
            // Calcular data em que atingirá 40 semanas de IG
            // Semanas restantes = 40 - idade gestacional atual
            const weeksRemaining = 40 - gestationalAgeNum;
            const date40Weeks = addDays(birthDateObj, weeksRemaining * 7);
            
            // Gerar datas subsequentes a cada 21 dias até atingir a data de 40 semanas
            let nextExamDate = addDays(firstExamDate, 21);
            let examCount = 2;
            
            while (nextExamDate < date40Weeks) {
                metabolic.push([`${examCount}º Exame Metabólico`, formatDate(nextExamDate)]);
                nextExamDate = addDays(nextExamDate, 21);
                examCount++;
            }
            
            // Adicionar a data final quando atingir 40 semanas de IG
            metabolic.push(["Exame Metabólico Final (40 sem)", formatDate(date40Weeks)]);
            
            results['Doença Metabólica Óssea (Cálcio, Fósforo e Fosfatase Alcalina séricos)'] = metabolic;
        }
        
        // 4. Triagem Auditiva
        results['Triagem Auditiva'] = [["Triagem Auditiva", "Pré-alta hospitalar"]];
        
        return results;
    }
    
    // Criar item de lista com checkbox
    function createChecklistItem(text, date) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-start';
        
        const div = document.createElement('div');
        div.className = 'd-flex align-items-center';
        
        // Container para os checkboxes
        const checkContainer = document.createElement('div');
        checkContainer.className = 'check-container';
        
        // Checkbox para "Solicitado"
        const requestedCheck = document.createElement('input');
        requestedCheck.type = 'checkbox';
        requestedCheck.id = `requested_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        requestedCheck.className = 'form-check-input no-print';
        
        const requestedLabel = document.createElement('label');
        requestedLabel.htmlFor = requestedCheck.id;
        requestedLabel.className = 'no-print';
        requestedLabel.textContent = 'Solicitado';
        
        // Checkbox para "Verificado"
        const verifiedCheck = document.createElement('input');
        verifiedCheck.type = 'checkbox';
        verifiedCheck.id = `verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        verifiedCheck.className = 'form-check-input no-print';
        
        const verifiedLabel = document.createElement('label');
        verifiedLabel.htmlFor = verifiedCheck.id;
        verifiedLabel.className = 'no-print';
        verifiedLabel.textContent = 'Verificado';
        
        // Adicionar os checkboxes e labels ao container
        checkContainer.appendChild(requestedCheck);
        checkContainer.appendChild(requestedLabel);
        checkContainer.appendChild(verifiedCheck);
        checkContainer.appendChild(verifiedLabel);
        
        // Texto do item
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        
        div.appendChild(textSpan);
        div.appendChild(checkContainer);
        
        // Badge para a data
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary';
        badge.textContent = date;
        
        li.appendChild(div);
        li.appendChild(badge);
        
        return li;
    }
    
    // Exibir resultados
    function displayResults(dates) {
        examsResults.innerHTML = '';
        
        // Percorrer todas as categorias de exames
        for (const category in dates) {
            // Criar título da categoria
            const categoryTitle = document.createElement('h5');
            categoryTitle.className = 'mt-4 mb-2';
            categoryTitle.textContent = category;
            
            // Criar lista de exames
            const examList = document.createElement('ul');
            examList.className = 'list-group mb-4';
            
            // Adicionar cada exame à lista
            dates[category].forEach(item => {
                const [text, date] = item;
                const li = createChecklistItem(text, date);
                examList.appendChild(li);
            });
            
            // Adicionar título e lista à seção de resultados
            examsResults.appendChild(categoryTitle);
            examsResults.appendChild(examList);
        }
        
        // Mostrar a seção de resultados
        resultsDiv.classList.remove('d-none');
        
        // Definir data de impressão
        const today = new Date();
        printDateSpan.textContent = today.toLocaleDateString('pt-BR');
    }
    
    // Mostrar erro
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
    }
    
    // Limpar erro
    function clearError() {
        errorDiv.textContent = '';
        errorDiv.classList.add('d-none');
    }
    
    // HANDLERS DE EVENTOS
    
    // Formulário principal
    screeningForm.addEventListener('submit', function(e) {
        e.preventDefault();
        clearError();
        
        try {
            // Obter valores do formulário
            const babyName = babyNameInput.value.trim();
            const birthDate = birthDateInput.value;
            const gestWeeks = parseInt(gestWeeksInput.value, 10);
            const gestDays = parseInt(gestDaysInput.value, 10);
            const birthWeightStr = birthWeightInput.value.trim();
            
            // Validar dados
            if (!babyName || !birthDate || isNaN(gestWeeks) || isNaN(gestDays)) {
                throw new Error('Preencha todos os campos corretamente');
            }
            
            // Normalizar peso
            const birthWeight = normalizeWeight(birthWeightStr);
            
            // Calcular idade gestacional em formato decimal para o backend
            const gestationalAge = gestWeeks + (gestDays / 7);
            // Formatar IG para exibição
            const gestationalAgeFormatted = gestDays > 0 ? 
                `${gestWeeks} semanas e ${gestDays} dias` : 
                `${gestWeeks} semanas`;
            
            // Calcular datas de triagem diretamente (sem backend)
            const dates = calculateUtiDates(
                babyName, 
                birthDate,
                gestationalAge,
                gestationalAgeFormatted,
                birthWeight,
                false // hasRiskFactors
            );
            
            // Mostrar dados do paciente
            patientDataSection.classList.remove('d-none');
            resNameSpan.textContent = babyName;
            resBirthDateSpan.textContent = formatDate(birthDate);
            resGestAgeSpan.textContent = gestationalAgeFormatted;
            resWeightSpan.textContent = birthWeight;
            
            // Exibir resultados
            displayResults(dates);
            
        } catch (error) {
            showError(error.message);
        }
    });
    
    // Botão de impressão
    printButton.addEventListener('click', function() {
        window.print();
    });
}); 
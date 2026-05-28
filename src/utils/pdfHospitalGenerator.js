const formatDoctorNameShort = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().toLowerCase().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const firstName = parts[0];
    
    const femaleNames = new Set(['aline', 'gisele', 'simone', 'kelly', 'evelyn', 'carmen', 'iris', 'lais', 'ester', 'ruth', 'raquel', 'mirian', 'sueli', 'marli', 'roseli', 'cleide', 'katiusa', 'mariana', 'maria']);
    const isFemale = firstName.endsWith('a') || femaleNames.has(firstName);
    const title = isFemale ? 'Dra.' : 'Dr.';
    
    if (parts.length === 1) return `${title} ${capitalize(parts[0])}`;
    
    return `${title} ${capitalize(parts[0])} ${capitalize(parts[1])}`;
};

const formatDoctorNameFull = (fullName, sexo) => {
    if (!fullName) return '';
    let title = 'Dr.';
    if (sexo === 'Feminino') {
        title = 'Dra.';
    } else if (!sexo) {
        const parts = fullName.trim().toLowerCase().split(' ').filter(Boolean);
        const firstName = parts[0] || '';
        const femaleNames = new Set(['aline', 'gisele', 'simone', 'kelly', 'evelyn', 'carmen', 'iris', 'lais', 'ester', 'ruth', 'raquel', 'mirian', 'sueli', 'marli', 'roseli', 'cleide', 'katiusa', 'mariana', 'maria']);
        if (firstName.endsWith('a') || femaleNames.has(firstName)) {
            title = 'Dra.';
        }
    }
    
    const capitalize = (s) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return `${title} ${capitalize(fullName)}`;
};

export const printHospitalEscalaPdf = (hospital, assignments, activeWeeks, activeMonthLabel, activeMonth, doctors, currentUser) => {
    const hospitalName = hospital.name;
    const sectors = hospital.sectors || [];
    
    // Encontrar apenas os médicos que tem plantão neste mês neste hospital
    const scheduledDoctorNames = new Set();
    activeWeeks.forEach(week => {
        week.days.forEach((day, dayIndex) => {
            if (!day.isOutOfMonth) {
                sectors.forEach((_, sIdx) => {
                    const slotId = `${activeMonth}-${week.id}-${hospital.id}-${sIdx}-${dayIndex}`;
                    const assignedData = assignments[slotId];
                    if (assignedData && assignedData.doctorName) {
                        scheduledDoctorNames.add(assignedData.doctorName);
                    }
                });
            }
        });
    });

    const activeDoctors = (doctors || []).filter(d => d.status === 'Ativo' && scheduledDoctorNames.has(d.name));

    let weeksHtml = '';
    
    activeWeeks.forEach((week) => {
        let theadRow = `
            <tr>
                <th colspan="2" style="background-color: transparent; border: none;"></th>
        `;
        
        week.days.forEach((day) => {
            const dateStr = day.date.split('/')[0];
            const dayName = day.dayName.substring(0, 3).toUpperCase();
            
            if (day.isOutOfMonth) {
                theadRow += `<th style="background-color: transparent; border: none; width: 12%;"></th>`;
            } else {
                theadRow += `<th style="width: 12%; padding: 4px; text-align: center; border: none;">
                    <div style="font-size: 10px; font-weight: bold; color: #334155;">${dateStr}</div>
                    <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">${dayName}</div>
                </th>`;
            }
        });
        
        theadRow += `</tr>`;
        
        let tbodyHtml = '';
        
        sectors.forEach((sector, sIdx) => {
            let rowHtml = `<tr>`;
            
            // Coluna Hospital (Merge across sectors)
            if (sIdx === 0) {
                rowHtml += `<td rowspan="${sectors.length}" style="width: 10%; background-color: #dcfce7; border: 1px solid #ffffff; text-align: center; font-weight: 900; color: #064e3b; font-size: 11px; padding: 4px;">${hospitalName.toUpperCase()}</td>`;
            }
            
            // Coluna Tipo (Setor)
            rowHtml += `<td style="width: 10%; background-color: #dcfce7; border: 1px solid #ffffff; text-align: center; font-weight: bold; color: #064e3b; font-size: 8px; padding: 4px;">${sector.toUpperCase()}</td>`;
            
            // Colunas dos Dias
            week.days.forEach((day, dayIndex) => {
                if (day.isOutOfMonth) {
                    rowHtml += `<td style="background-color: #f8fafc; border: 1px solid #ffffff;"></td>`;
                } else {
                    const slotId = `${activeMonth}-${week.id}-${hospital.id}-${sIdx}-${dayIndex}`;
                    const assignedData = assignments[slotId];
                    
                    if (assignedData && assignedData.doctorName) {
                        const formattedName = formatDoctorNameShort(assignedData.doctorName);
                        const subtitleHtml = assignedData.subtitle ? `<div style="font-size: 5.5px; font-style: italic; color: #64748b; margin-top: 1px;">${assignedData.subtitle}</div>` : '';
                        
                        rowHtml += `<td style="background-color: #dcfce7; border: 1px solid #ffffff; text-align: center; padding: 2px 1px;">
                            <div style="font-size: 8px; font-weight: 900; color: #064e3b; margin-bottom: 1px; line-height: 1;">${formattedName}</div>
                            <div style="font-size: 6.5px; font-weight: bold; color: #059669;">${assignedData.time || ''}</div>
                            ${subtitleHtml}
                        </td>`;
                    } else {
                        rowHtml += `<td style="background-color: #f1f5f9; border: 1px solid #ffffff;"></td>`;
                    }
                }
            });
            
            rowHtml += `</tr>`;
            tbodyHtml += rowHtml;
        });

        weeksHtml += `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; font-family: sans-serif;">
                <thead>${theadRow}</thead>
                <tbody>${tbodyHtml}</tbody>
            </table>
        `;
    });

    // Contatos (Doctors Footer - Página 2)
    let contatosHtml = '';
    const docsPerCol = Math.ceil(activeDoctors.length / 4) || 1;
    
    let columns = [[], [], [], []];
    activeDoctors.forEach((doc, idx) => {
        const colIndex = Math.floor(idx / docsPerCol);
        if (colIndex < 4) {
            columns[colIndex].push(doc);
        } else {
            columns[3].push(doc);
        }
    });

    columns.forEach(col => {
        let colHtml = `<div style="flex: 1; padding: 0 10px;">`;
        col.forEach(doc => {
            colHtml += `
                <div style="font-size: 8px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                    <div style="font-weight: 900; color: #334155; font-size: 9px; margin-bottom: 2px;">${formatDoctorNameFull(doc.name, doc.sexo)}</div>
                    <div style="color: #64748b; font-size: 7px;">
                        ${doc.crm ? `CRM: ${doc.crm}` : ''} ${doc.rqe ? `| RQE: ${doc.rqe}` : ''}
                    </div>
                    <div style="color: #64748b; font-size: 7px; margin-top: 1px;">
                        ${doc.cpf ? `CPF: ${doc.cpf}` : ''} ${doc.telefone ? `| Tel: ${doc.telefone}` : ''}
                    </div>
                </div>
            `;
        });
        colHtml += `</div>`;
        contatosHtml += colHtml;
    });

    const coordinator = (doctors || []).find(d => d.name && d.name.toLowerCase().includes('marcos andr'));
    const coordName = coordinator ? formatDoctorNameFull(coordinator.name, coordinator.sexo) : 'Dr. Marcos André Mickus';
    const coordRole = (coordinator && coordinator.sexo === 'Feminino') ? 'Coordenadora Médica' : 'Coordenador Médico';
    let coordDocs = [];
    if (coordinator?.crm) coordDocs.push(`CRM: ${coordinator.crm}`);
    if (coordinator?.rqe) coordDocs.push(`RQE: ${coordinator.rqe}`);
    const coordDocsStr = coordDocs.length > 0 ? coordDocs.join(' | ') : 'CRM/RQE do Coordenador';

    const dataGeracao = new Date().toLocaleDateString('pt-BR');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Escala - ${hospitalName} - ${activeMonthLabel}</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    margin: 0; padding: 0; 
                    color: #0f172a; 
                    background-color: #ffffff;
                }
                .container {
                    width: 100%;
                    max-width: 100%;
                    zoom: 0.95;
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 8px; 
                }
                .logo-left {
                    width: 150px;
                    height: 40px;
                    object-fit: contain;
                    object-position: left center;
                }
                .logo-right {
                    width: 150px;
                    height: 40px;
                    object-fit: contain;
                    object-position: right center;
                }
                .title {
                    text-align: center;
                    flex: 1;
                }
                h1 { 
                    margin: 0; 
                    font-size: 14px; 
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                h2 {
                    margin: 2px 0 0 0;
                    font-size: 11px;
                    font-weight: bold;
                    color: #475569;
                    text-transform: uppercase;
                }
                .hospital-logo-text {
                    font-weight: 900;
                    color: #b91c1c;
                    font-size: 14px;
                    text-transform: uppercase;
                    text-align: right;
                }
                
                .footer-page {
                    page-break-before: always;
                    padding-top: 20px;
                }
                .contatos-header {
                    font-size: 12px;
                    font-weight: 900;
                    margin-bottom: 15px;
                    color: #0f172a;
                    text-transform: uppercase;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 5px;
                }
                .contatos-grid {
                    display: flex;
                    width: 100%;
                }
                
                .signature-area {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-around;
                    align-items: flex-end;
                }
                .signature-box {
                    text-align: center;
                    width: 250px;
                }
                .signature-line {
                    border-top: 1px solid #334155;
                    width: 100%;
                    margin: 0 auto 5px auto;
                }
                .signature-name {
                    font-size: 10px;
                    font-weight: 900;
                    color: #0f172a;
                    margin-bottom: 2px;
                }
                .signature-role {
                    font-size: 9px;
                    color: #475569;
                }
                
                .company-footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 8px;
                    font-weight: bold;
                    color: #64748b;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }
                .logo-ism {
                    height: 30px;
                    object-fit: contain;
                }
                
                @media print {
                    .container { zoom: 95%; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- PÁGINA 1: ESCALA -->
                <div class="header">
                    <img src="/assets/logo-anestesp.png" class="logo-left" alt="Anestesp" onerror="this.style.display='none'" />
                    
                    <div class="title">
                        <h1>ESCALA MENSAL - ANESTESISTAS</h1>
                        <h2>${activeMonthLabel}</h2>
                    </div>
                    
                    ${hospital.logoUrl 
                        ? `<img src="${hospital.logoUrl}" class="logo-right" alt="${hospitalName}" />` 
                        : `<div class="hospital-logo-text">${hospitalName}</div>`
                    }
                </div>

                ${weeksHtml}
            </div>

            <!-- PÁGINA 2: CONTATOS E ASSINATURAS -->
            <div class="container footer-page">
                <div class="contatos-header">CONTATOS MÉDICOS - ${hospitalName} (${activeMonthLabel})</div>
                <div class="contatos-grid">
                    ${contatosHtml}
                </div>
                
                <div class="signature-area">
                    <div class="signature-box">
                        <div class="signature-name" style="font-size: 11px;">${coordName}</div>
                        <div class="signature-role">${coordRole}<br/>${coordDocsStr}</div>
                    </div>
                    
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-name">Assinatura do Responsável</div>
                        <div class="signature-role">Diretor Operacional</div>
                    </div>
                </div>

                <div class="company-footer">
                    <img src="/assets/logo-ism.png" class="logo-ism" alt="ISM Health Solutions" onerror="this.style.display='none'" />
                    <div>ISM Health Solutions - CNPJ 29.732.524/0001-59</div>
                    <div>Escala gerada em: ${dataGeracao}</div>
                </div>
            </div>

            <script>
                window.onload = () => { 
                    setTimeout(() => {
                        window.print(); 
                        window.close(); 
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '', 'width=1100,height=800');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};

// Instante da torre em UTC. A tela converte para o fuso do relógio do Windows.
// A duração entra em milissegundos: dois usuários com fusos diferentes
// não gravam o mesmo término como horário local incompatível.

function toUtcIso(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toISOString();
}

function parseUtcInstant(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    // Sem fuso explícito, cada Windows interpretaria a string no próprio relógio.
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(trimmed)) {
        return null;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isCoherentSchedule(vistoIso, fimIso, durationSeconds) {
    const visto = parseUtcInstant(vistoIso);
    const fim = parseUtcInstant(fimIso);
    if (!visto || !fim) return false;
    if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) return false;
    return fim.getTime() - visto.getTime() === durationSeconds * 1000;
}

function buildScheduleFromInstant(now, durationSeconds) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;
    if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) return null;

    const visto = new Date(now.getTime());
    const fim = new Date(visto.getTime() + (durationSeconds * 1000));
    const vistoHorario = toUtcIso(visto);
    const horarioFinalizacao = toUtcIso(fim);
    if (!isCoherentSchedule(vistoHorario, horarioFinalizacao, durationSeconds)) return null;

    return {
        vistoHorario: vistoHorario,
        horarioFinalizacao: horarioFinalizacao,
        cadastradoEm: vistoHorario
    };
}

function formatDateTime(date, withYear, timeZone) {
    const includeYear = withYear !== false;
    const instant = date instanceof Date ? date : parseUtcInstant(date);
    if (!instant || Number.isNaN(instant.getTime())) {
        return includeYear ? '--' : '--/-- --:--:--';
    }

    const options = {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    };
    if (includeYear) options.year = 'numeric';
    // Sem timeZone, o Intl usa o fuso do sistema — o relógio do Windows.
    if (timeZone) options.timeZone = timeZone;

    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(instant);
    const pick = (type) => {
        const part = parts.find((item) => item.type === type);
        return part ? part.value : '';
    };

    const clock = `${pick('hour')}:${pick('minute')}:${pick('second')}`;
    if (!includeYear) return `${pick('day')}/${pick('month')} ${clock}`;
    return `${pick('day')}/${pick('month')}/${pick('year')} ${clock}`;
}

function formatModalDateTime(date) {
    return formatDateTime(date, false);
}

function getWindowsTimeZoneId() {
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (zone) return zone;
    } catch (error) {
        // Segue para o rótulo genérico.
    }
    return 'local';
}

function getWindowsClockOffsetLabel() {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            timeZoneName: 'shortOffset'
        }).formatToParts(new Date());
        const name = parts.find((part) => part.type === 'timeZoneName');
        if (name && name.value) return name.value;
    } catch (error) {
        // Segue para o cálculo pelo deslocamento do sistema.
    }

    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absolute / 60));
    const minutes = absolute % 60;
    if (minutes === 0) return `GMT${sign}${hours}`;
    return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

function renderWindowsClock() {
    if (typeof document === 'undefined') return;
    const now = typeof getEstimatedServerTime === 'function' ? getEstimatedServerTime() : new Date();
    const text = formatDateTime(now);
    document.querySelectorAll('.local-clock').forEach((element) => {
        element.textContent = text;
    });
}

function startWindowsClock() {
    renderWindowsClock();
    setInterval(renderWindowsClock, 1000);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startWindowsClock);
    } else {
        startWindowsClock();
    }
}

frappe.pages['blockchain-dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'ChainGuard Dashboard',
        single_column: true
    });

    $(frappe.render_template('blockchain_dashboard')).appendTo(page.body);
    frappe.require('/assets/blockchain_scm/css/blockchain_dashboard.css');

    load_kpis();
    load_reputations();
    load_chain();

    setInterval(function() {
        load_kpis();
        load_reputations();
        load_chain();
    }, 10000);

    $(wrapper).on('click', '#btn-simulate', function() {
        var count = Number($('#sim-count').val()) || 3;
        setActionState(true);
        showMessage('Running simulation...', 'info');

        frappe.call({
            method: 'blockchain_scm.blockchain_api.simulate_malicious_attack',
            args: { malicious_count: count },
            callback: function(r) {
                setActionState(false);
                if (r.message) {
                    var kpis = r.message.network_kpis;
                    showMessage(
                        '<strong>' + r.message.message + '</strong> — ' +
                        'Throughput: <strong>' + kpis.throughput + ' blk/s</strong> | ' +
                        'Latency: <strong>' + kpis.latency_ms + ' ms</strong> | ' +
                        'Malicious: <strong>' + kpis.malicious_pct + '%</strong>',
                        'danger'
                    );
                    load_kpis();
                    load_reputations();
                }
            }
        });
    });

    $(wrapper).on('click', '#btn-reset', function() {
        setActionState(true);
        showMessage('Resetting network state...', 'success');

        frappe.call({
            method: 'blockchain_scm.blockchain_api.reset_simulation',
            callback: function(r) {
                setActionState(false);
                showMessage('Network reset successfully.', 'success');
                load_kpis();
                load_reputations();
                load_chain();
            }
        });
    });

    $(wrapper).on('click', '#btn-seed-demo', function() {
        setActionState(true);
        showMessage('Initializing demo network...', 'info');

        frappe.call({
            method: 'blockchain_scm.blockchain_api.seed_demo_network',
            callback: function(r) {
                setActionState(false);
                if (r.message) {
                    showMessage('<strong>' + r.message.message + '</strong>', 'info');
                    load_kpis();
                    load_reputations();
                    load_chain();
                }
            }
        });
    });
};

function setActionState(isBusy) {
    ['#btn-simulate', '#btn-reset', '#btn-seed-demo'].forEach(function(selector) {
        $(selector).prop('disabled', isBusy);
    });
}

function showMessage(message, type) {
    var color = '#2d3748';
    var background = '#f5f7fa';

    if (type === 'danger') {
        color = '#991b1b';
        background = '#fde8e8';
    } else if (type === 'success') {
        color = '#166534';
        background = '#ecfdf5';
    } else if (type === 'info') {
        color = '#1d4ed8';
        background = '#eff6ff';
    }

    $('#sim-result').html(
        '<div style="padding:14px;border-radius:14px;background:' + background + ';color:' + color + ';">' +
        message +
        '</div>'
    );
}

function load_kpis() {
    frappe.call({
        method: 'blockchain_scm.blockchain_api.get_kpis',
        callback: function(r) {
            if (r.message) {
                var d = r.message;
                $('#kpi-throughput').text(d.throughput);
                $('#kpi-latency').text(d.latency_ms);
                $('#kpi-blocks').text(d.total_blocks);
                $('#kpi-malicious').text(d.malicious_nodes);

                if (d.chain_valid) {
                    $('#chain-status').html('<span class="dot green"></span> Chain Valid — ' + d.total_blocks + ' blocks');
                } else {
                    $('#chain-status').html('<span class="dot red"></span> Chain Invalid!');
                }
            }
        }
    });
}

function load_reputations() {
    $('#reputation-table').html('<p class="muted">Loading node reputations...</p>');

    frappe.call({
        method: 'blockchain_scm.blockchain_api.get_node_reputations',
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                var rows = r.message.map(function(n) {
                    return '<tr>' +
                        '<td>' + n.node_id + '</td>' +
                        '<td>' + n.score + '</td>' +
                        '<td><span class="status-badge status-' + n.status + '">' + n.status + '</span></td>' +
                        '<td>' + n.successes + '</td>' +
                        '<td>' + n.failures + '</td>' +
                    '</tr>';
                }).join('');

                $('#reputation-table').html(
                    '<div class="table-scroll">' +
                    '<table class="rep-table">' +
                    '<thead><tr>' +
                    '<th scope="col">Node ID</th><th scope="col">Reputation Score</th><th scope="col">Status</th><th scope="col">Successes</th><th scope="col">Failures</th>' +
                    '</tr></thead>' +
                    '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                    '</div>'
                );
            } else {
                $('#reputation-table').html('<p class="muted">No nodes recorded yet. Seed the demo network or submit a transaction to populate reputations.</p>');
            }
        }
    });
}

function load_chain() {
    $('#chain-blocks').html('<p class="muted">Loading recent blocks...</p>');

    frappe.call({
        method: 'blockchain_scm.blockchain_api.get_blockchain',
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                var blocks = r.message.slice().reverse().map(function(b) {
                    var tx = b.transactions.map(function(t) {
                        return t.event_type || t.type || 'genesis';
                    }).join(', ');

                    return '<div class="block-card">' +
                        '<div class="block-header">' +
                        '<span class="block-index">Block #' + b.index + '</span>' +
                        '<span>' + tx + '</span>' +
                        '</div>' +
                        '<div class="block-hash">Hash: ' + b.hash + '</div>' +
                        '<div class="block-hash">Prev: ' + b.previous_hash + '</div>' +
                        '</div>';
                }).join('');

                $('#chain-blocks').html(blocks);
            } else {
                $('#chain-blocks').html('<p class="muted">No blockchain history available yet.</p>');
            }
        }
    });
}

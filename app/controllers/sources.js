import Ember from 'ember';
import ENV from '../config/environment';
import { getUniqueList, encodeParams } from 'ember-share/utils/elastic-query';

export default Ember.Controller.extend({

    metrics: Ember.inject.service(),

    numberOfSources: 0,
    sources: [],
    numberOfEvents: 0,
    sourcesLastUpdated: Date().toString(),
    placeholder: 'search aggregated sources',
    loading: true,
    source_selected: '',

    init() {
        this._super(...arguments);
        this.loadPage();
    },

    loadPage(url=null) {
        url = url || ENV.apiUrl + '/sources/?sort=long_title';
        this.set('loading', true);
        return Ember.$.ajax({
            url: url,
            crossDomain: true,
            type: 'GET',
            contentType: 'application/json',
        }).then((json) => {
            this.set('numberOfSources', json.meta.pagination.count);
            this.get('sources').addObjects(json.data);

            if (json.links.next) {
                return this.loadPage(json.links.next);
            }
            Ember.run(() => {
                this.set('loading', false);
            });
        });
    },

    typeaheadQueryUrl() {
        return `${ENV.apiUrl}/search/sources/_search`;
    },

    buildTypeaheadQuery(text) {
        return {
            size: 10,
            query: {
                match: {
                    'name.autocomplete': {
                        query: text,
                        operator: 'and',
                        fuzziness: 'AUTO'
                    }
                }
            }
        };
    },

    handleTypeaheadResponse(response) {
        return getUniqueList(response.hits.hits.mapBy('_source.name'));
    },
    actions: {
        changeFilter(selected) {
            const category = 'sources';
            const action = 'filter';
            const label = selected;

            this.get('metrics').trackEvent({ category, action, label });

            this.transitionToRoute('discover', { queryParams: { sources: encodeParams(selected) } });
        },

        elasticSearch(term) {
            if (Ember.isBlank(term)) { return []; }

            const category = 'sources';
            const action = 'search';
            const label = term;

            this.get('metrics').trackEvent({ category, action, label });

            var data = JSON.stringify(this.buildTypeaheadQuery(term));

            return Ember.$.ajax({
                url: this.typeaheadQueryUrl(),
                crossDomain: true,
                type: 'POST',
                contentType: 'application/json',
                data: data
            }).then(json =>
                this.handleTypeaheadResponse(json)
            );
        }
    }
});

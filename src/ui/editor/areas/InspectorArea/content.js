/* eslint-disable no-underscore-dangle */
import React from 'react';
import {map, extend, last} from 'lodash';
import {makeContentComponent} from '../OutlinerArea/content';
import {InspectorNode} from './node';
import {editor} from '../../../styles';
import DebugData from '../../DebugData';
import {RootSym, applyFunction, getValue, getAllowedKinds, UtilFunctions, isPureFunc} from './utils';
import {CustomValue} from './value';
import {version} from '../../../../../package.json';
import {getParamNames} from '../../../../utils';

const headerStyle = {
    position: 'absolute',
    height: 20,
    top: 0,
    left: 0,
    right: 0,
    padding: 4,
    textAlign: 'left',
    background: '#333333',
    borderBottom: '1px solid gray',
    userSelect: 'none'
};

const mainStyle = {
    position: 'absolute',
    bottom: 0,
    top: headerStyle.height + (headerStyle.padding * 2) + 1,
    left: 0,
    right: 0,
    padding: 4
};

const watchStyle = {
    position: 'relative',
    background: editor.base.background,
    margin: '16px 12px',
    border: '1px solid grey',
    borderRadius: 8
};

const trashIconStyle = {
    position: 'absolute',
    right: -11,
    top: -11,
    cursor: 'pointer',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: 4
};

const funcEditorStyle = extend({}, mainStyle, {
    padding: 16,
    overflowY: 'auto'
});

const contentStyle = {
    position: 'relative'
};

const watchButtonStyle = extend({}, editor.button, {
    fontSize: 14,
    padding: '2px 12px',
    color: 'white',
    fontWeight: 'bold',
    border: '1px inset #5cffa9',
    borderRadius: 4,
    background: 'rgba(0, 0, 0, 0.5)',
});

const itemStyle = {
    position: 'relative',
    marginTop: 14,
    padding: 8,
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: 4,
    background: 'rgb(35,35,35)',
};

const prefixStyle = {
    paddingLeft: 4,
    verticalAlign: 'middle'
};

export class InspectorContent extends React.Component {
    constructor(props) {
        super(props);
        const addWatch = props.stateHandler.addWatch;
        this.editBindings = this.editBindings.bind(this);
        this.renderValueBrowser = this.renderValueBrowser.bind(this);
        this.content = makeContentComponent(InspectorNode(RootSym, addWatch, this.editBindings), null, null, 'dot');
        this.browseContent = makeContentComponent(InspectorNode(RootSym, null, this.editBindings), null, contentStyle, 'dot');
        this.state = {
            bindings: null
        };
    }

    editBindings(path, parent, userData, root) {
        this.setState({
            bindings: {
                id: userData && userData.id,
                path,
                parent,
                params: (userData && userData.bindings && userData.bindings[path.join('.')]) || [],
                root: root || ((userData && userData.rootName === 'utils') ? (() => UtilFunctions) : undefined)
            }
        });
        this.props.stateHandler.setTab('bindings');
    }

    render() {
        return <div>
            {this.renderHeader()}
            {this.renderContent()}
        </div>;
    }

    componentDidMount() {
        if (this.props.sharedState.tab === 'bindings' && !this.state.bindings) {
            this.props.stateHandler.setTab('explore');
        }
    }

    renderContent() {
        const tab = this.props.sharedState.tab || 'explore';
        if (tab === 'explore') {
            return this.renderExplorer();
        } else if (tab === 'watch') {
            return this.renderWatches();
        } else if (tab === 'utils') {
            return this.renderUtils();
        } else if (tab === 'bindings') {
            return this.renderBindings();
        }
        return null;
    }

    renderExplorer() {
        return <div style={mainStyle}>
            {React.createElement(this.content, this.props)}
        </div>;
    }

    renderWatches() {
        const watches = this.props.sharedState.watches;
        const watchesStyle = extend({}, mainStyle, {
            background: watches.length > 0 ? 'black' : 'inherit',
            padding: 0,
            overflowY: 'auto'
        });
        return <div style={watchesStyle}>
            {(!watches || watches.length === 0) && <div style={{margin: 25, textAlign: 'center'}}>
                Nothing to watch just yet...
            </div>}
            {map(watches, (w, idx) => {
                const props = {
                    sharedState: {
                        path: w.path
                    },
                    stateHandler: {
                        setPath: (path) => {
                            this.props.stateHandler.setPath(path);
                            this.props.stateHandler.setTab('explore');
                        },
                    },
                    ticker: this.props.ticker,
                    userData: {
                        id: w.id,
                        path: w.path,
                        bindings: w.bindings,
                        rootName: w.rootName
                    }
                };
                const getRoot = () => (w.rootName === 'utils' ? UtilFunctions : DebugData.scope);
                const sym = w.rootName === 'utils' ? 'Utils' : RootSym;
                const node = InspectorNode(sym, null, this.editBindings, getRoot);
                const content = makeContentComponent(node, null, contentStyle, 'dot');
                return <div key={idx} style={watchStyle}>
                    {React.createElement(content, props)}
                    <img
                        style={trashIconStyle}
                        src="editor/icons/trash.png"
                        onClick={this.props.stateHandler.removeWatch.bind(null, w.id)}
                    />
                </div>;
            })}
        </div>;
    }

    renderHeader() {
        const tabStyle = selected => ({
            height: 20,
            lineHeight: '20px',
            padding: '0 10px',
            cursor: 'pointer',
            color: selected ? 'white' : 'grey'
        });
        const onClick = (tab) => {
            if (tab !== 'bindings') {
                this.setState({bindings: null});
            }
            this.props.stateHandler.setTab(tab);
        };
        const watches = this.props.sharedState.watches;
        const tab = this.props.sharedState.tab || 'explore';
        return <div style={headerStyle}>
            <span style={tabStyle(tab === 'explore')} onClick={() => onClick('explore')}>Explore</span>
            <span style={tabStyle(tab === 'utils')} onClick={() => onClick('utils')}>Utils</span>
            {watches.length > 0 &&
                <span style={tabStyle(tab === 'watch')} onClick={() => onClick('watch')}>Watch<b>[{watches.length}]</b></span>}
            {this.state.bindings &&
                <span style={tabStyle(tab === 'bindings')} onClick={() => onClick('bindings')}>Bindings</span>}
        </div>;
    }

    renderBindings() {
        if (!this.state.bindings)
            return null;

        const {id, path, parent, params, browse, root} = this.state.bindings;
        const fct = getValue(path, (root && root()) || DebugData.scope, params);

        if (typeof (fct) !== 'function') {
            return null;
        }

        const isPure = isPureFunc(fct, last(path), parent);

        const paramNames = getParamNames(fct);

        const titleStyle = {
            color: '#5cffa9',
            fontSize: 16,
            textAlign: 'center',
        };

        const addWatch = () => {
            let rootName = null;
            if (root && root() === UtilFunctions) {
                rootName = 'utils';
            }
            this.props.stateHandler.addWatch(path, {[path.join('.')]: params}, id, rootName);
            this.props.stateHandler.setTab('watch');
            this.setState({bindings: null});
        };

        const action = () => {
            if (isPure) {
                addWatch();
            } else {
                this.setState({
                    result: {
                        value: applyFunction(fct, parent, jPath, {[jPath]: params}, new Error('Invalid call'))
                    }
                });
            }
        };

        const refreshIconStyle = {
            cursor: 'pointer',
            position: 'absolute',
            top: 4,
            right: 4,
        };

        const jPath = path.join('.');
        let result = new CustomValue(
            <span>
                Not available.<br/>
                Click <button style={watchButtonStyle} onClick={action}>
                    call function
                </button> to get result.
            </span>
        );
        if (isPure) {
            result = applyFunction(fct, parent, jPath, {[jPath]: params}, new Error('Invalid call'));
        } else if (this.state.result) {
            result = this.state.result.value;
        }

        const onClickRefresh = () => this.forceUpdate();

        return <div style={funcEditorStyle}>
            {!isPure &&
                <div style={{color: 'red'}}>
                    <div style={{textAlign: 'center'}}>WARNING!</div>
                    <p>
                        This function is unpure, calling it will change the game state.
                        It may cause crashes if not called appropriately.
                        Use with caution!
                    </p>
                </div>}
            <div style={titleStyle}>
                {path.join('.')}
                (<span style={{color: 'grey'}}>{paramNames.join(', ')}</span>)
            </div>
            {this.renderDocumentation(fct)}
            {map(paramNames, (p, idx) => this.renderBindingParam(p, idx, browse))}
            <div style={itemStyle}>
                {this.renderValueBrowser('result', result)}
                {isPure && <img style={refreshIconStyle} src="editor/icons/reset.png" onClick={onClickRefresh}/>}
            </div>
            <div style={{paddingTop: 16, textAlign: 'right'}}>
                <button style={watchButtonStyle} onClick={action}>
                    {isPure ? (id ? 'Edit watch' : 'Add watch') : 'Call'}
                </button>
            </div>
        </div>;
    }

    renderDocumentation(fct) {
        const linkStyle = {
            textAlign: 'center',
            color: 'grey',
            textDecoration: 'none',
            padding: '2px 8px'
        };
        if (fct && fct.__location) {
            const [filename, line] = fct.__location.split(':');
            let tag = 'master';
            if (!version.match('-dev')) {
                tag = `v${version}`;
            }
            const href = `https://github.com/agrande/lba2remake/blob/${tag}/${filename}#L${line}`;
            return <div style={itemStyle}>
                Source:
                <a href={href} style={linkStyle} target="_blank">
                    {fct.__location}
                </a>
            </div>;
        }
        return null;
    }

    renderBindingParam(p, idx, browse) {
        const {parent, path, params} = this.state.bindings;
        const fctName = last(path);

        const allowedKinds = getAllowedKinds(parent, fctName, idx);
        const selectedKind = (params[idx] && params[idx].kind) || allowedKinds[0];

        const onChange = ({target: {value}}) => {
            const bindings = this.state.bindings;
            if (!bindings.params[idx])
                bindings.params[idx] = {kind: selectedKind, value};
            else
                bindings.params[idx].value = value;
            this.setState({bindings});
        };

        const onKeyDown = e => e.stopPropagation();

        const pValue = params[idx] ? params[idx].value : undefined;

        const onRef = (ref) => {
            if (ref && pValue) {
                ref.value = pValue;
            }
        };

        let validParam = true;
        if (selectedKind === 'g') {
            validParam = pValue && getValue(pValue.split('.'), DebugData.scope, params) !== undefined;
        }

        const inputStyle = {
            width: '60%',
            verticalAlign: 'middle',
            background: validParam ? 'white' : '#ffa5a1'
        };

        const iconStyle = {
            cursor: 'pointer',
            padding: 0,
            margin: 0,
            verticalAlign: 'middle',
            paddingLeft: 8
        };

        const onClick = () => {
            const bindings = this.state.bindings;
            bindings.browse = idx;
            this.setState({bindings});
        };

        let content;
        if (browse === idx) {
            const param = this.state.bindings.params[idx];
            const sharedState = {
                path: param && param.value ? param.value.split('.') : []
            };
            const props = {
                sharedState,
                stateHandler: {
                    setPath: (newPath) => {
                        const bindings = this.state.bindings;
                        if (newPath.length > 0) {
                            if (!bindings.params[idx]) {
                                bindings.params[idx] = {value: newPath.join('.'), kind: selectedKind};
                            } else {
                                bindings.params[idx].value = newPath.join('.');
                            }
                            delete bindings.browse;
                            this.setState({bindings});
                        } else {
                            sharedState.path = newPath;
                        }
                    },
                },
                ticker: this.props.ticker,
            };
            content = <div>
                {React.createElement(this.browseContent, props)}
            </div>;
        } else {
            const prefixByKind = {
                g: () => <span style={prefixStyle}>{RootSym}.</span>,
                e: () => {
                    let args = '';
                    if (parent && parent.__cb_info && path in parent.__cb_info) {
                        // eslint-disable-next-line no-new-func
                        args = parent.__cb_info[path][idx].split(',').join(', ');
                        return <span style={prefixStyle}>({args}) =&gt; </span>;
                    }
                    return null;
                }
            };
            content = <div style={{paddingTop: 8, lineHeight: '20px', verticalAlign: 'middle'}}>
                {prefixByKind[selectedKind]()}
                <input ref={onRef} type="text" onChange={onChange} style={inputStyle} onKeyDown={onKeyDown}/>
                {selectedKind !== 'e' && <img style={iconStyle} src="editor/icons/magnifier.png" onClick={onClick}/>}
            </div>;
        }

        const prettyKind = {
            g: 'Global path',
            e: 'Expression',
        };

        const onSelectKind = (e) => {
            const bindings = this.state.bindings;
            if (bindings.browse === idx && e.target.value === 'e') {
                delete bindings.browse;
            }
            if (!bindings.params[idx])
                bindings.params[idx] = {kind: e.target.value};
            else
                bindings.params[idx].kind = e.target.value;
            this.setState({bindings});
        };

        const kindSelection = allowedKinds.length > 1 ?
            <select onChange={onSelectKind} value={selectedKind} style={extend({float: 'right'}, editor.select)}>
                {map(allowedKinds, kind =>
                    <option key={kind} value={kind}>{prettyKind[kind]}</option>)}
            </select>
            : <span style={{fontStyle: 'italic', float: 'right'}}>{prettyKind[selectedKind]}</span>;

        return <div key={idx} style={itemStyle}>
            <div>
                Param&nbsp;<span style={{color: 'grey'}}>{p}</span>
                &nbsp;
                {kindSelection}
            </div>
            {content}
        </div>;
    }

    renderUtils() {
        return <div style={mainStyle}>
            {this.renderValueBrowser('Utils', UtilFunctions)}
        </div>;
    }

    renderValueBrowser(name, root) {
        const getRoot = () => root;
        const editBindings = (path, parent) => {
            this.editBindings(path, parent, null, getRoot);
        };
        const node = InspectorNode(name, null, editBindings, getRoot);
        const content = makeContentComponent(node, null, contentStyle, 'dot');
        const props = {
            sharedState: {
                path: []
            },
            stateHandler: {
                setPath: () => {}
            },
            ticker: this.props.ticker
        };
        return React.createElement(content, props);
    }
}
